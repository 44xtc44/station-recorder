// audio.js
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
  createAudio,
  audioContext,
  analyser,
  audioSource,
  analyserInit,
  createMainAudioLine,
  connectAnalyserInit,
};
let analyser = null;
let audioSource = null;
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

function createAudio() {
  return new Promise(async (resolve, _) => {
    const audioElem = await createAudioElements();
    audioElem.style.display = "none";
    const audioHelper = document.getElementById("audioElementHelperBar");
    audioHelper.appendChild(audioElem); // attach to DOM tree, else its id not found

    const audioVolume = await createVolumeSlider(audioElem);
    // sets also metaData.set()["audioVolume"]
    await restoreAudioVolume(audioElem, audioVolume);

    const volBtns = await createVolumeBtns(); // ret dict
    await createVolBtnListener(volBtns, audioElem, audioVolume);

    
    // Build a grid for audio UI elements.
    const audioVolumeContainer = document.createElement("div");
    audioVolumeContainer.id = "audioVolumeContainer";

    audioVolumeContainer.appendChild(audioVolume);

    const eqalizerContainer = document.createElement("div");
    eqalizerContainer.id = "eqalizerContainer";

    const audioBar = document.getElementById("audioBar");
    audioBar.appendChild(audioVolumeContainer);
    audioVolumeContainer.classList.add("grid_activity_bar_item");
    // udioVolumeContainer.classList.add("grid_activity_bar_player");

    audioBar.appendChild(volBtns.volumeButtons);
    volBtns.volumeButtons.classList.add("grid_activity_bar_item");
    // volBtns.volumeButtons.classList.add("grid_activity_bar_player");

    audioBar.appendChild(eqalizerContainer);

    resolve();
  });
}

function createAudioElements() {
  return new Promise((resolve, _) => {
    // Audio, no change here (Video play), else 'audio.onerror' fails!!!
    // video.onerror will return a network error
    const audio = document.createElement("audio");
    audio.setAttribute("id", "audioWithControls");
    audio.setAttribute("crossorigin", "anonymous");
    audio.setAttribute("preload", "metadata");
    audio.setAttribute("autoplay", "");
    audio.setAttribute("controls", "");
    audio.volume = "0.7";

    audioContext = new AudioContext();
    audioContext.onerror = (e) => {
      console.error("audioContext->", e); //nothing so far, may be needed if load stream
    };

    // Plug for the connector chain. Ends in audioContext.destination (speaker).
    audioSource = audioContext.createMediaElementSource(audio);
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

    resolve(audio);
  });
}

/**
 * Volume buttons for mobile user.
 * @param {*} volBtns
 * @param {*} audio
 * @param {*} audioVolume
 * @returns
 */
function createVolBtnListener(volBtns, audio, audioVolume) {
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
      setAudioVolume(audio, audioVolume);
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
      setAudioVolume(audio, audioVolume);
    };

    resolve();
  });
}

/**
 * Buttons element for Android user.
 * Wrap all elements in container to show side by side.
 * @param {*} audio
 * @returns
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

// split
function createVolumeSlider(audioElem) {
  return new Promise((resolve, _) => {
    // https://freefrontend.com/css-range-sliders/
    const audioVolume = document.createElement("input"); // slider
    audioVolume.setAttribute("id", "audioVolume");

    audioVolume.setAttribute("type", "range");
    audioVolume.setAttribute("value", "75");
    audioVolume.classList.add("slider_neutral");

    audioVolume.addEventListener("input", () => {
      setAudioVolume(audioElem, audioVolume);
    });
    resolve(audioVolume);
  });
}

function restoreAudioVolume(audioElem, audioVolume) {
  return new Promise(async (resolve, _) => {
    let elemDict = await getAppSettings({ id: audioElem.id });
    if (!elemDict) {
      const defaultVolume = "75";
      await setAppSettings({ id: audioElem.id, volume: defaultVolume });
      audioVolume.value = defaultVolume;
      metaData.set()["audioVolume"] = defaultVolume;
    } else {
      audioVolume.value = elemDict.volume;
      setAudioVolume(audioElem, audioVolume);
      metaData.set()["audioVolume"] = audioVolume.value;
    }
    resolve();
  });
}

/**
 * Either volume slider or button press updates also
 * metaData.set()["audioVolume"] to have both element in sync.
 * @param {*} audio
 * @param {*} audioVolume
 */
function setAudioVolume(audio, audioVolume) {
  const volDisplay = document.getElementById("volDisplay");

  audio.volume = audioVolume.value / 100;
  if (volDisplay !== null && volDisplay !== undefined) {
    volDisplay.innerText = audioVolume.value.toString();
  }
  metaData.set()["audioVolume"] = audioVolume.value;
  setAppSettings({ id: audio.id, volume: audioVolume.value });
}

/**
 * Must have an analyzer for each animation.
 * Not only due to different fft size requirements.
 * Else one canvas will show distortions, if there are two canva s.
 */
function createMainAudioLine() {
  return new Promise((resolve, _) => {
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination); // speaker
    resolve();
  });
}

function connectAnalyserInit() {
  return new Promise((resolve, _) => {
    // extra line for init screen
    audioSource.connect(analyserInit); // silent, then may .connect(audioContext.destination);
    resolve();
  });
}
