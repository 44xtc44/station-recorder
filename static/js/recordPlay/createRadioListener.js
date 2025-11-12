// createRadioListener.js
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

import { showDelMsg } from "../buildGrids/uiDelRadio.js";
import { showBlacklist } from "../buildGrids/uiBlacklist.js";
import { submitStationClicked } from "../network/publicDbCom.js";
import { switchRecorderState } from "./radioOperation.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";
import { detectStream, providerUrlGet } from "../network/streamDetect.js";

export {
  recordBoxListener,
  listenBoxListener,
  settingsBoxListener,
  playBtnColorOn,
};

const parser = new DOMParser(); // sanitize html, mixed html with dyn. vars

/**
 * Radio operations and radio listener module need refac
 * Move to new /stationOperations folder
 * fun refac for better readability in this module.
 */

/**
 * Enqueue recorder.
 * Remove recorder.
 * @param {*} station
 * @param {*} gridItem
 */
function recordBoxListener(station, recBtn) {
  // press to announce record, press again to stop
  recBtn.addEventListener("click", () => {
    switchRecorderState(station.stationuuid); // #f7b733  #fc4a1a  #49bbaa
  });
}

function listenBoxListener(station, playBtn) {
  playBtn.addEventListener("click", (e) => {
    // e.preventDefault();
    const stationName = station.name;
    const stationuuid = station.stationuuid;
    metaData.set().infoDb[stationuuid].isPlaying = true;

    // Create extra dict to switch player. Else loop over 50k objects.
    const isRegistered = metaData.get()["player"];
    if (isRegistered === undefined) metaData.set()["player"] = {};

    let isPlayUuid = metaData.get().player.isPlaying;
    // first click on play
    if (isPlayUuid === undefined) {
      isPlayUuid = "";
      metaData.set().player["isPlaying"] = "";
    }

    // second plus click on play
    if (isPlayUuid !== stationuuid) {
      switchOnPlayer(stationuuid, stationName, isPlayUuid);
      // other station
      if (isPlayUuid !== undefined && isPlayUuid !== "") {
        metaData.set().infoDb[isPlayUuid].isPlaying = false;
      }
    } else {
      // same button press again
      const audio = document.getElementById("audioWithControls");
      audio.pause();
      playBtnColorOff(stationuuid);
      metaData.set().player.isPlaying = "";
      // register our station
      metaData.set().infoDb[stationuuid].isPlaying = false;
    }
  });
}

async function switchOnPlayer(stationuuid, stationName, isPlayUuid) {
  const audio = document.getElementById("audioWithControls");
  // Grid elem under monitor displays current audio elem connected station name.
  // Other button was pressed before.
  if (audio.muted) audio.muted = !audio.muted; // streamActivity can mute (pause)

  if (isPlayUuid !== "") {
    const otherBtn = document.getElementById(isPlayUuid + "_listenBox");
    // if switched between continent or country btn is gone
    if (otherBtn !== null) {
      playBtnColorOff(isPlayUuid);
    }
  }
  metaData.set().player.isPlaying = stationuuid;
  playBtnColorOn(stationuuid, stationName);

  // pre check stream is online, or resolve playlist
  const urlObj = await detectStream(stationuuid);

  if (urlObj.url === false) {
    return;
  }
  const audioUrl = urlObj.url;
  audio.src = audioUrl; // can be empty str

  submitStationClicked(stationuuid, stationName);
  // for display of country if play()
  const ccTo3char = metaData.get().infoDb[stationuuid].ccTo3char;
  recMsg(["play ", ccTo3char, stationName]);
}

function playBtnColorOn(stationuuid, stationName) {
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
}

function playBtnColorOff(stationuuid) {
  const divActivityPlayer = document.getElementById("divActivityPlayer");
  divActivityPlayer.innerText = "---";
  divActivityPlayer.style.visibility = "hidden";
  document.getElementById(stationuuid + "_listenBox").style.backgroundColor =
    "transparent";
  const playImg = document.getElementById("playImg_" + stationuuid);
  playImg.src = "./images/speaker-icon-off.svg";
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
