// mediaElements.js
"use strict";
/**
 *  This file is part of station-recorder. station-recorder is hereby called the app.
 *  The app is published to be a distributed database for public radio and
 *  TV station URLs. The cached DB copy can be used also if
 *  the public database fails. Additional features shall improve the
 *  value of the application. Example is the vote, click statistic feature.
 *  Copyright (C) 2025 René Horn
 *
 *    The app is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    any later version.
 *
 *    The app is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with the app. If not, see <http://www.gnu.org/licenses/>.
 */

import { recMsg } from "../network/messages.js";
import { metaData } from "../central.js";
import { providerUrlGet } from "../network/streamDetect.js";
import { getAppSettings, setAppSettings } from "../database/idbAppSettings.js";

export {
  createMediaElements,
  createVideoElement,
  audioContext,
  analyser,
  audioSource,
  videoSource,
  analyserInit,
  createMainAudioLine,
  connectAnalyserInit,
};
let analyser = null;
let audioSource = null;
let videoSource = null;
let analyserInit = null;
let audioContext = null;

/**
 * Three audio elements will be shown in a grid.
 * (A) Volume slider
 * (B) Volume buttons for mobiles
 * (C) Equalizer with band selection and presets
 *
 * Volume related elements can be attached to grid at creation time.
 * Equalizer must wait until intro is done.
 * Audio line is interrupted to get no sound but the equalizer output for
 * lightning show.
 *
 */

/**
 *
 * @returns {Promise<undefined>}
 */
function createMediaElements() {
  return new Promise(async (resolve, _) => {
    /**
     * Video
     */
    const videoElem = await createVideoElement();
    // videoElem.style.display = "none";
    const videoBar = document.getElementById("videoBar");
    videoBar.appendChild(videoElem); // attach to DOM tree, else its id not found

    /**
     * Audio
     */
    const audioElem = await createAudioElement();
    audioElem.style.display = "none";

    await mediaConnectors(audioElem, videoElem);

    // hidden div at end of HTML to not disturb div stack
    const audioHelper = document.getElementById("audioElementHelperBar");
    audioHelper.appendChild(audioElem); // attach to DOM tree, else its id not found

    const audioVolume = await createVolumeSlider(audioElem, videoElem);
    // sets also metaData.set()["audioVolume"]
    await restoreAudioVolume(audioElem, audioVolume, videoElem);

    const volBtns = await createVolumeBtns(); // ret dict
    await createVolBtnListener(volBtns, audioElem, audioVolume, videoElem);

    // Build a grid for audio UI elements.
    const audioVolumeContainer = document.createElement("div");
    audioVolumeContainer.id = "audioVolumeContainer";

    audioVolumeContainer.appendChild(audioVolume);

    const eqalizerContainer = document.createElement("div");
    eqalizerContainer.id = "eqalizerContainer";

    const audioBar = document.getElementById("audioBar");
    audioBar.appendChild(audioVolumeContainer);
    audioVolumeContainer.classList.add("grid_activity_bar_item");
    // audioVolumeContainer.classList.add("grid_activity_bar_player");

    audioBar.appendChild(volBtns.volumeButtons);
    volBtns.volumeButtons.classList.add("grid_activity_bar_item");
    // volBtns.volumeButtons.classList.add("grid_activity_bar_player");

    audioBar.appendChild(eqalizerContainer);

    resolve();
  });
}

/**
 * Video
 * video.onerror will return a network error so we can not detect
 * FireFox's http-https mixed->switch to https failure.
 * So a demand to attach equalizer also to a video element.
 * @returns {Promise<HTMLVideoElement>}
 */
function createVideoElement() {
  return new Promise((resolve, _) => {
    const video = document.createElement("video");
    video.setAttribute("id", "videoScreen");
    video.setAttribute("crossorigin", "anonymous");
    video.setAttribute("preload", "metadata");
    video.setAttribute("autoplay", "");
    video.setAttribute("controls", "");
    video.volume = "0.7";
    video.width = "460";

    resolve(video);
  });
}

/**
 * Audio
 * --> No change here (Video player), else 'audio.onerror' fails!!!
 * video.onerror will return a network error so we can not detect
 * FireFox's http-https mixed->switch to https failure.
 * So a demand to attach equalizer also to a video element.
 * @returns {Promise<HTMLAudioElement>}
 */
function createAudioElement() {
  return new Promise((resolve, _) => {
    const audio = document.createElement("audio");
    audio.setAttribute("id", "audioWithControls");
    audio.setAttribute("crossorigin", "anonymous");
    audio.setAttribute("preload", "metadata");
    audio.setAttribute("autoplay", "");
    audio.setAttribute("controls", "");
    audio.volume = "0.7";

    resolve(audio);
  });
}

/**
 * Plug the cables into the speaker.
 * @param {HTMLAudioElement} audio
 * @param {HTMLVideoElement} video
 * @returns {Promise<undefined>}
 */
function mediaConnectors(audio, video) {
  return new Promise((resolve, _) => {
    audioContext = new AudioContext();
    audioContext.onerror = (e) => {
      console.error("audioContext->", e); //nothing so far, may be needed if load stream
    };

    // Plug for the connector chain. Ends in audioContext.destination (speaker).
    audioSource = audioContext.createMediaElementSource(audio);
    videoSource = audioContext.createMediaElementSource(video);
    analyser = audioContext.createAnalyser(); // feeds main animation (fft)
    analyserInit = audioContext.createAnalyser(); // init screen, diff fftSizes for anim.

    audio.onerror = async (e) => {
      if (e.target.error.message === "Failed to open media") {
        const providerUrl = await providerUrlGet(e.target.src);
        if (!providerUrl.includes("http")) {
          recMsg(["audio element fail :: try again"]);
          return;
        }
        recMsg(["audio element ::", e.target.error.message]);
        // old BUG again https://bugzilla.mozilla.org/show_bug.cgi?id=1354633
        // This error message will be blank when privacy.resistFingerprinting = true
        // spring-react https://github.com/pmndrs/react-spring/issues/664
        recMsg([
          "<a href=" +
            e.target.src + // or providerUrl
            " target=_blank>-> Click to open stream in a new tab. (Volume in tab)</a>",
        ]);
      }
    };

    resolve();
  });
}

/**
 * Volume buttons for mobile user.
 * @param {HTMLDivElement} volBtns
 * @param {HTMLAudioElement} audio
 * @param {HTMLInputElement} audioVolume
 * @param {HTMLVideoElement} video
 * @returns {Promise<undefined>}
 */
function createVolBtnListener(volBtns, audio, audioVolume, video) {
  return new Promise((resolve, _) => {
    const delay = 150;
    const volMinus = volBtns.volMinus;
    const volPlus = volBtns.volPlus;
    const volDisplay = volBtns.volDisplay;
    let count = metaData.get()["audioVolume"];

    if (count === null || count === undefined) {
      count = audioVolume.value;
    }
    volDisplay.innerText = count.toString();

    volPlus.onmousedown = (e) => {
      e.preventDefault();
      count = parseInt(metaData.get()["audioVolume"]);
      if (count > 100) {
        count = 100;
      } else {
        count > 100 ? 100 : (count += 5);
      }
      volDisplay.innerText = count.toString();
      metaData.set()["audioVolume"] = count;
    };
    volPlus.onmouseup = () => {
      count = metaData.get()["audioVolume"];
      audioVolume.value = count;
      setAudioVolume(audio, audioVolume, video);
    };

    volMinus.onmousedown = (e) => {
      e.preventDefault();
      count = parseInt(metaData.get()["audioVolume"]);
      if (count < 0) {
        count = 0;
      } else {
        count < 0 ? 0 : (count -= 5);
      }
      volDisplay.innerText = count.toString();
      metaData.set()["audioVolume"] = count;
    };
    volMinus.onmouseup = () => {
      count = metaData.get()["audioVolume"];
      audioVolume.value = count;
      setAudioVolume(audio, audioVolume, video);
    };

    resolve();
  });
}

/**
 * Buttons element for Android user.
 * Wrap all elements in container to show side by side.
 * @param {HTMLAudioElement} audio
 * @returns {Promise<Object>} dict
 * @returns {Object<HTMLDivElement>} volMinus
 * @returns {Object<HTMLDivElement>} volPlus
 * @returns {Object<HTMLDivElement>} volDisplay
 * @returns {Object<HTMLDivElement>} volumeButtons
 */
function createVolumeBtns() {
  return new Promise((resolve, _) => {
    const volMinus = document.createElement("div");
    volMinus.classList.add("imgTransform");

    volMinus.id = "volMinus";
    volMinus.style.marginTop = "2px";
    const volPlus = document.createElement("div");
    volPlus.classList.add("imgTransform");
    volPlus.id = "volPlus";
    volPlus.style.marginTop = "2px";
    const volDisplay = document.createElement("div");
    volDisplay.classList.add("volDisplayStyle");
    volDisplay.id = "volDisplay";
    volDisplay.innerText = "---";

    const spanVolDisplay = document.createElement("span");
    spanVolDisplay.style.display = "inline-block";
    spanVolDisplay.style.verticalAlign = "baseline";
    const spanVolMinus = document.createElement("span");
    spanVolMinus.style.display = "inline-block";
    const spanVolPlus = document.createElement("span");
    spanVolPlus.style.display = "inline-block";

    // button icons
    const btnHeight = "28px";
    const imgPlus = document.createElement("img");
    imgPlus.id = "imgPlus";
    imgPlus.src = "./images/volume-plus-icon.svg";
    imgPlus.style.height = btnHeight;
    volPlus.appendChild(imgPlus);

    const imgMinus = document.createElement("img");
    imgMinus.id = "imgPlus";
    imgMinus.src = "./images/volume-minus-icon.svg";
    imgMinus.style.height = btnHeight;
    volMinus.appendChild(imgMinus);

    spanVolMinus.appendChild(imgMinus); // span vertical align is better
    spanVolPlus.appendChild(imgPlus);
    volMinus.appendChild(spanVolMinus);
    volDisplay.appendChild(spanVolDisplay);
    volPlus.appendChild(spanVolPlus);

    // set all div inside wrap to inline-block, for side by side
    const volumeButtons = document.createElement("div");
    volumeButtons.id = "volumeButtons";
    volumeButtons.appendChild(volMinus);
    volumeButtons.appendChild(volDisplay);
    volumeButtons.appendChild(volPlus);

    volumeButtons.classList.add("grid_vol_buttons"); // align divs horizontal
    volMinus.classList.add("grid_vol_buttons_item");
    spanVolPlus.classList.add("grid_vol_buttons_item");
    volDisplay.classList.add("grid_vol_buttons_item");

    resolve({
      volMinus: volMinus,
      volPlus: volPlus,
      volDisplay: volDisplay,
      volumeButtons: volumeButtons,
    });
  });
}

/**
 * Audio volume slider for PC user. Android user use buttons.
 * @param {HTMLAudioElement} audio
 * @param {HTMLVideoElement} video
 * @returns {Promise<HTMLInputElement>} audioVolume
 */
function createVolumeSlider(audio, video) {
  return new Promise((resolve, _) => {
    // https://freefrontend.com/css-range-sliders/
    const audioVolume = document.createElement("input"); // slider
    audioVolume.setAttribute("id", "audioVolume");

    audioVolume.setAttribute("type", "range");
    audioVolume.setAttribute("value", "75");
    audioVolume.classList.add("slider_neutral");

    audioVolume.addEventListener("input", () => {
      setAudioVolume(audio, audioVolume, video);
    });
    resolve(audioVolume);
  });
}

/**
 *
 * @param {HTMLAudioElement} audio
 * @param {HTMLInputElement} audioVolume
 * @param {HTMLVideoElement} video
 * @returns {Promise<undefined>}
 */
function restoreAudioVolume(audio, audioVolume, video) {
  return new Promise(async (resolve, _) => {
    let elemDict = await getAppSettings({ id: audio.id });
    if (!elemDict) {
      const defaultVolume = "75";
      await setAppSettings({ id: audio.id, volume: defaultVolume });
      audioVolume.value = defaultVolume;
      metaData.set()["audioVolume"] = defaultVolume;
    } else {
      audioVolume.value = elemDict.volume;
      setAudioVolume(audio, audioVolume, video);
      metaData.set()["audioVolume"] = audioVolume.value;
    }
    resolve();
  });
}

/**
 * Either volume slider or button press updates also
 * metaData.set()["audioVolume"] to have both element in sync.
 * @param {HTMLAudioElement} audio
 * @param {HTMLInputElement} audioVolume
 * @param {HTMLVideoElement} video
 */
function setAudioVolume(audio, audioVolume, video) {
  const volDisplay = document.getElementById("volDisplay");

  audio.volume = audioVolume.value / 100;
  video.volume = audioVolume.value / 100;
  if (volDisplay !== null && volDisplay !== undefined) {
    volDisplay.innerText = audioVolume.value.toString();
  }
  metaData.set()["audioVolume"] = audioVolume.value;
  setAppSettings({ id: audio.id, volume: audioVolume.value });
}

/**
 * Must have an analyzer for each animation.
 * Not only due to different fft size requirements.
 * Else one canvas will show distortions, if there are two canvas.
 * @returns {Promise<undefined>}
 */
function createMainAudioLine() {
  return new Promise((resolve, _) => {
    audioSource.connect(analyser);
    videoSource.connect(analyser);
    analyser.connect(audioContext.destination); // speaker
    resolve();
  });
}

/**
 * Late connect after splash screen to prevent loader sound to play,
 * Sound drives the flash animation.
 * @returns {Promise<undefined>}
 */
function connectAnalyserInit() {
  return new Promise((resolve, _) => {
    audioSource.connect(analyserInit); // silent, then may .connect(audioContext.destination);
    videoSource.connect(analyserInit);
    resolve();
  });
}
