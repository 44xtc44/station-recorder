// mediaElemListener.js
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
import { shakaPlayer } from "../M3U8_HSL/shakaPlayer.js";
import { recMsg } from "../network/messages.js";
import { metaData } from "../central.js";

import { showDelMsg } from "../buildGrids/uiDelRadio.js";
import { showBlacklist } from "../buildGrids/uiBlacklist.js";
import { submitStationClicked } from "../network/publicDbCom.js";
import { switchRecorderState } from "./recordRadioStream.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";
import { detectStream, providerUrlGet } from "../network/streamDetect.js";
import { locateTarget } from "../M3U8_HSL/m3u8Downloader.js";

export {
  recordBoxListener,
  listenBoxListener,
  settingsBoxListener,
  playBtnColorOn,
};

const parser = new DOMParser(); // sanitize html, mixed html with dyn. vars

/**
 * Recorder.
 * @param {Object} station
 * @param {Object<string>} stationuuid
 * @param {HTMLDivElement} gridItem
 */
function recordBoxListener(station, recBtn) {
  // press to announce record, press again to stop
  recBtn.addEventListener("click", async () => {
    await switchRecorderState(station.stationuuid); // #f7b733  #fc4a1a  #49bbaa
  });
}

/**
 * Play button (listenBox grid creation).
 * One button must ON/OFF/and SWITCH both audio and video elements.
 *
 * Alzheimer prevention exercise.
 * @param {Object} station
 * @param {Object<string>} name
 * @param {Object<string>} stationuuid
 * @param {HTMLDivElement} playBtn
 */
function listenBoxListener({ name, stationuuid }, playBtn) {
  playBtn.addEventListener("click", async () => {
    const playingUuid = await playBtnState(stationuuid);
    if (playingUuid === "STOP") {
      playerOff(stationuuid);
      return;
    }
    await playerOff(playingUuid);
    await playerOn(stationuuid, name, playingUuid);
  });
}

function playBtnState(stationuuid) {
  return new Promise((resolve, _) => {
    metaData.set().infoDb[stationuuid].isPlaying = true; // station obj itself

    /**
     * Create an extra dict to switch player.
     * Else loop over 50k objects to find out someone is playing.
     * Need to switch grids and audio, video elements separate.
     * {player: {stationuuid: ""}, {isM3U8: false}}
     */
    const isRegistered = metaData.get().player;
    if (isRegistered === undefined) {
      metaData.set()["player"] = {
        stationuuid: "", // audio elem currently playing
        isM3U8: false, // video elem stream needs .unload() command
      };
    }

    const playingUuid = metaData.get().player.stationuuid;
    // STOP playing. Same button press again.
    if (playingUuid === stationuuid || playingUuid === "") {
      metaData.set().player.stationuuid = "";
      metaData.set().infoDb[stationuuid].isPlaying = false;
    }
    // Other station play button pressed.
    if (playingUuid !== stationuuid) {
      metaData.set().player.stationuuid = stationuuid;
      if (playingUuid !== "") {
        metaData.set().infoDb[playingUuid].isPlaying = false; // DB unregister prev. station
      }
      resolve(playingUuid);
    }
    resolve("STOP");
  });
}

/**
 * Unload HSL or audio stream.
 * @param {string} playingUuid
 */
async function playerOff(playingUuid) {
  const audio = document.getElementById("audioWithControls");
  const video = document.getElementById("videoScreen");
  video.style.display = "none";

  await shakaPlayer.unload();
  await shakaPlayer.detach(video);
  audio.pause(); // load a base64 audio silent string to get .onended
  // video.pause();
  if (playingUuid !== "") await playBtnColorOff(playingUuid);
}

/**
 * Connect HSL or audio stream.
 * @param {string} stationuuid needs to be played
 * @param {string} stationName needs to be played
 * @param {string} playingUuid current player can be "hidden" from UI (country selected)
 */
async function playerOn(stationuuid, stationName, playingUuid) {
  // If switched between continent or country station btn is gone. Other div stack shown.
  const hiddenBtn = document.getElementById(playingUuid + "_listenBox");
  if (hiddenBtn !== null) await playBtnColorOff(playingUuid);
  await playBtnColorOn(stationuuid, stationName);
  /**
   * Grid elem under monitor displays current audio elem connected station name.
   * Other button was pressed before.
   * streamActivity.js can mute (pause)
   */
  const audio = document.getElementById("audioWithControls");
  if (audio.muted) audio.muted = !audio.muted;
  const video = document.getElementById("videoScreen");

  await streamConnect(stationuuid, audio, video); // shaka is (module import)
  submitStationClicked(stationuuid, stationName); // to inet public DB
  // UI display - country 3char code
  const ccTo3char = metaData.get().infoDb[stationuuid].ccTo3char;
  recMsg(["play ", ccTo3char, stationName]);
}

/**
 * Shaka player is used only for m3u8 streams in video element.
 * Normal audio streams via audio element.
 * Volume, analyzer and equalizer manage both audio and video element.
 * Each stream type got its own streamDetect module. Audio rejects m3u8.
 * @param {string} stationuuid
 * @param {HTMLAudioElement} audio audio element
 * @param {HTMLVideoElement} video instance
 */
async function streamConnect(stationuuid, audio, video) {
  const isM3U8 = metaData.get().infoDb[stationuuid].isM3u8;
  if (isM3U8) {
    // HSL stream
    const playlistURL = metaData.get().infoDb[stationuuid].url;
    const url = await locateTarget(playlistURL); // possible redirect in .m3u8 file
    if (url === false) {
      return;
    }

    metaData.set().player.isM3U8 = true;
    await shakaPlayer.attach(video);

    try {
      await shakaPlayer.load(url);
    } catch (shakaError) {
      console.error("playerOn->shaka load", shakaError.code); // action!
      // video.poster error msg, or jpg or favicon or ...
      return;
    }
    const audioOnly = shakaPlayer.isAudioOnly();
    const videoOnly = shakaPlayer.isVideoOnly();
    if (videoOnly || (!audioOnly && !videoOnly)) {
      video.style.display = "block";
    }
  }

  if (!isM3U8) {
    // Audio stream is online, or resolve a playlist URL.
    const urlObj = await detectStream(stationuuid);
    if (urlObj.url === false) return;

    metaData.set().player.isM3U8 = false;
    audio.src = urlObj.url; // can be empty str
  }
}

function playBtnColorOn(stationuuid, stationName) {
  return new Promise((resolve, _) => {
    const divActivityPlayer = document.getElementById("divActivityPlayer");
    divActivityPlayer.innerText = stationName;
    divActivityPlayer.style.visibility = "visible";
    const playBtn = document.getElementById(stationuuid + "_listenBox");
    // not yet created
    if (playBtn !== null) {
      playBtn.style.backgroundColor = "#49bbaa"; // #49bbaa
      const playImg = document.getElementById("playImg_" + stationuuid);
      playImg.src = "./images/speaker-icon-on.svg";
    }
    resolve();
  });
}

function playBtnColorOff(stationuuid) {
  return new Promise((resolve, _) => {
    const divActivityPlayer = document.getElementById("divActivityPlayer");
    divActivityPlayer.innerText = "---";
    divActivityPlayer.style.visibility = "hidden";
    document.getElementById(stationuuid + "_listenBox").style.backgroundColor =
      "transparent";
    const playImg = document.getElementById("playImg_" + stationuuid);
    playImg.src = "./images/speaker-icon-off.svg";
    resolve();
  });
}

/**
 * Settings box.
 * @param {*} e
 * @param {*} station
 * @param {*} stationGroup
 */
async function settingsBoxListener(e, station, stationGroup) {
  const stationName = station.name;
  const stationuuid = station.stationuuid;
  e.preventDefault(); // icon inside div inherits listener

  // both fun return the child div
  const setOptions = await createFeatureDivOutline({
    parentId: "fixedPositionAnchor",
    divOutline: "setOptions",
  });
  // remove X that hide the div
  setOptions.removeChild(setOptions.firstElementChild);
  document.getElementById("fixedPositionAnchor").style.height = "100%";
  // X must remove div
  const spanClose = document.createElement("span");
  spanClose.classList.add("handCursor");
  spanClose.innerText = "✖";
  spanClose.style.textAlign = "right";
  spanClose.style.paddingRight = "14px";
  spanClose.style.display = "inline-block";
  spanClose.style.width = "100%";
  spanClose.style.backgroundColor = "#fc4a1a";
  spanClose.addEventListener("click", () => {
    setOptions.remove();
  });
  setOptions.appendChild(spanClose);

  setOptions.classList.add("column500");
  setOptions.style.width = "500px";
  setOptions.style.display = "block";
  const divDelRadio = await createFeatureDivSection({
    parentId: "setOptions",
    childId: "divDelRadio",
  });

  // Delete station from local DB store with specific name.
  if (stationGroup === "Custom") {
    const divDel = document.createElement("div");
    divDel.id = stationuuid + "_divDelRadio";
    divDelRadio.appendChild(divDel);
    const delRadioClicker = document.createElement("button");
    divDel.appendChild(delRadioClicker);
    delRadioClicker.setAttribute("id", stationuuid + "delRadioClicker");
    delRadioClicker.textContent = "✖ station";
    delRadioClicker.addEventListener("click", () => {
      showDelMsg(stationuuid, divDel);
    });
  }

  // Show Tags.
  const divTags = await createFeatureDivSection({
    parentId: "setOptions",
    childId: "divTags",
  });
  const divTagsShow = document.createElement("div");
  divTagsShow.id = stationuuid + "_divTagsShow";
  divTags.appendChild(divTagsShow);
  divTagsShow.innerText = "tags: " + metaData.get().infoDb[stationuuid].tags;

  // show Dataset
  const divCopyDataset = await createFeatureDivSection({
    parentId: "setOptions",
    childId: "divCopyDataset",
  });
  const divDataset = document.createElement("div");
  const stationObj = metaData.get().infoDb[stationuuid];
  let dataHtml = "<br>";
  Object.entries(stationObj).map((arrayRow) => {
    const propertyVal = arrayRow[1];
    let writeVal = propertyVal; // keep bool; copy/paste as JS object
    if (typeof propertyVal !== "boolean") writeVal = '"' + propertyVal + '"';
    dataHtml += arrayRow[0].concat(": ", writeVal, ",", "<br>");
  });
  const summaryStr =
    "<details><summary>Station Details</summary>" + dataHtml + "</details>";
  const summaryParsed = parser.parseFromString(summaryStr, "text/html");
  const summaryTags = summaryParsed.getElementsByTagName("body");
  for (const tag of summaryTags) {
    divDataset.appendChild(tag);
  }
  divCopyDataset.appendChild(divDataset);

  // show Icecast Shoutcast
  const divShoutcast = await createFeatureDivSection({
    parentId: "setOptions",
    childId: "divShoutcast",
  });

  // disassamble url
  const shoutcastEndpoint = metaData.get().infoDb[stationuuid].url;
  const shoutcastProvider = await providerUrlGet(shoutcastEndpoint);
  const divExternShoutcast = document.createElement("div");
  divTagsShow.id = stationuuid + "_divExternShoutcast";
  divShoutcast.appendChild(divExternShoutcast);

  const providerStr =
    "<Try> play station at provider URL: " +
    "<a href=" +
    shoutcastProvider +
    " target='_blank'>" +
    shoutcastProvider +
    "</a>";
  const providerParsed = parser.parseFromString(providerStr, "text/html");
  const providerTags = providerParsed.getElementsByTagName("body");
  for (const tag of providerTags) {
    divExternShoutcast.appendChild(tag);
  }

  // Blacklist.
  const divBlackFeat = await createFeatureDivSection({
    parentId: "setOptions",
    childId: "divBlackFeat",
  });

  showBlacklist({
    dbId: stationuuid,
    stationName: stationName,
    parentDiv: divBlackFeat,
    masterDiv: setOptions,
  });
}
