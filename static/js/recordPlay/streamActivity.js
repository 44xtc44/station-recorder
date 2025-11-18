// streamActivity.js
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
import { switchRecorderState } from "./recordRadioStream.js";
export { createActivityPlayer, createActivityBar };

/**
 * Player name display grid. (one element)
 * Keep grid layout.
 */
function createActivityPlayer() {
  return new Promise((resolve, _) => {
    const parent = document.getElementById("activityBar");
    metaData.set()["createActivityPlayer"] = "";

    const gridItem = document.createElement("div");
    gridItem.id = "divActivityPlayer";
    gridItem.classList.add("grid_activity_bar_item");
    gridItem.classList.add("grid_activity_bar_player");
    gridItem.classList.add("cutOverflow");
    gridItem.innerText = "---";
    gridItem.style.visibility = "hidden";
    parent.appendChild(gridItem);

    gridItem.addEventListener("click", () => {
      // idle? Do nothing.
      if (gridItem.innerText === "---") return; // gridItem is hidden at page load

      const audio = document.getElementById("audioWithControls");
      const video = document.getElementById("videoScreen");
      let stationName = gridItem.innerText;

      //
      if (gridItem.innerText === "[ Pause ]") {
        stationName = metaData.get()["createActivityPlayer"];
        video.play();
        audio.muted = !audio.muted;
        recMsg(["play ", stationName]);
        gridItem.innerText = stationName;
        return;
      }

      video.pause();
      audio.muted = true;
      metaData.set()["createActivityPlayer"] = stationName;
      recMsg(["pause ", stationName]);
      gridItem.innerText = "[ Pause ]";
    });

    resolve();
  });
}

/**
 * Recorder buttons.
 * Used in streamDataGet.js.
 *
 * Better use an anchor div .
 * Stop one of multiple recorder, remove anchor and recreate
 * remaining recorder buttons. Needs a dictionary for tracking names.
 * Only name of anchor is used all over the place.
 * @param {*}
 * @returns
 */
function createActivityBar(stationuuid, stationName) {
  if (metaData.get()["activityBar"] === undefined)
    metaData.set()["activityBar"] = {};
  metaData.set()["activityBar"][stationName] = true;
  const parent = document.getElementById("activityBar");
  const gridItem = document.createElement("div");
  gridItem.setAttribute("id", "gridItemActivity_" + stationName);
  gridItem.classList.add("grid_activity_bar_item");
  gridItem.classList.add("grid_activity_bar_recorder");
  gridItem.classList.add("cutOverflow"); // cut overflow
  gridItem.innerText = stationName;
  parent.appendChild(gridItem);

  gridItem.addEventListener("click", () => {
    switchRecorderState(stationuuid);
  });
  return gridItem;
}
