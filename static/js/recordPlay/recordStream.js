// recordStream.js
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

/**
 * ToDo: Save all active recorder display (grid) in an object
 * to avoid loosing DOM connection on long running recording.
 * Description; fail to remove the active recorder div.
 *
 * --> Perhapsonly related to circular imports. Check first, try fixing.
 */
import { recMsg } from "../network/messages.js";
import { metaData } from "../central.js";
import { getIndex } from "../database/idbSetGetValues.mjs";
import { record } from "../network/runner.js";
import { submitStationClicked } from "../network/publicDbCom.js";
import { activityBar } from "./streamActivity.js";
import {
  stationDbCreate,
  dbRegisterStreamer,
  registerAsDownloder,
  deleteAsDownloder,
  getDumpIncompleteFiles,
} from "../database/recorderState.js";

export {
  switchRecorderState,
  removeAllRecorder,
  recBtnColor,
  showRecorderActive,
};

/**
 * Switch a single recorder state.
 * Send click to public DB. Votes badge is hidden, during recording.
 * "streamDataGet.js" writes a running recorder id into indexed DB.
 *
 * Votes badge is removed on record, since there is not enough space.
 * Record button and votes button may be deleted (station object container)
 * if new country or continent station div stack is shown.
 * @param {string} stationuuid str
 * @returns {Promise<undefined>} Promise undefined
 */
async function switchRecorderState(stationuuid) {
  const station = metaData.get().infoDb[stationuuid];

  if (!station.isRecording) {
    await stationDbCreate(stationuuid);
    await dbRegisterStreamer(stationuuid, station.name);
    await registerAsDownloder(stationuuid);

    await switchOnState(stationuuid);
    await recBtnColor(stationuuid, true);
    await votesBadgeShow(stationuuid, false);
    await record(stationuuid);
    
    submitStationClicked(stationuuid, station.id); // to public DB if UI setting true
    return; // switchOnState station.isRecording active
  }
  if (station.isRecording) {
    await switchOffState(stationuuid);
    await recBtnColor(stationuuid, false);
    await votesBadgeShow(stationuuid, true);
    await deleteAsDownloder(stationuuid);
    return;
  }
}

/**
 * Recorder & metadata ripper loops continue.
 * @param {string} stationuuid str
 * @returns {Promise<undefined>} Promise undefined
 */
async function switchOnState(stationuuid) {
  const station = metaData.get().infoDb[stationuuid];
  const { isActive } = await getDumpIncompleteFiles(); // is UI settings active
  const activityDiv = await activityBar(stationuuid, station.name); // recorder name grid

  metaData.set().infoDb[stationuuid]["dumpIncomplete"] = isActive;
  metaData.set().infoDb[stationuuid]["activityDiv"] = activityDiv;
  metaData.set().infoDb[stationuuid].isRecording = true;
  metaData.set().infoDb[stationuuid].isListening = true;
}

/**
 * Recorder & metadata ripper loops break.
 * @param {string} stationuuid str
 * @returns {Promise<undefined>} Promise undefined
 */
function switchOffState(stationuuid) {
  return new Promise((resolve, _) => {
    metaData.set().infoDb[stationuuid].isActive = false; // runner.js prevent double call
    metaData.set().infoDb[stationuuid].isRecording = false;
    metaData.set().infoDb[stationuuid].isListening = false;

    const activityDiv = metaData.get().infoDb[stationuuid]["activityDiv"];
    activityDiv.remove();
    resolve();
  });
}
/**
 * Reord button style.
 * Record button may be deleted
 * if new country or continent station div stack is shown.
 *
 * divRef is option if switching back to "Favorites" div stack.
 * Caller stationContainer.js
 * Else div not found (null) in DOM. For whatever reason.
 * @param {string} stationuuid str
 * @param {boolean} isActive bool
 * @param {HTMLDivElement} divRef record button option
 */
async function recBtnColor(stationuuid, isActive, divRef) {
  let recBtn = undefined;
  if (divRef !== undefined) {
    recBtn = divRef;
  } else {
    recBtn = document.getElementById("divBoxRecord_" + stationuuid);
  }

  if (recBtn === null) return;

  if (isActive) {
    recBtn.style.color = "#DC143C"; // Crimson col
  } else {
    recBtn.style.color = "black";
  }
}

function votesBadgeShow(stationuuid, isActive) {
  return new Promise((resolve, _) => {
    const votesBadge = document.getElementById("divVotesBadge_" + stationuuid);
    if (votesBadge === null) return;

    if (isActive) {
      votesBadge.style.display = "block";
    } else {
      votesBadge.style.display = "none";
    }
    resolve();
  });
}

/**
 * Read current recorder from object store.
 * Array[{id: xxx}, {id: yyy}, ...]
 */
async function removeAllRecorder() {
  const array = await getIndex({
    dbName: "app_db",
    store: "downloader",
  });
  for await (const recorder of array) {
    await switchRecorderState(recorder.id);
  }
  await recMsg({
    txt: "stop all recorder " + array.length + " done",
    level: "warning",
  });
}

/**
 * Intervall checks if recorder is active to switch
 * button of the audio volume slider from knob to disk.
 *
 * -> Should write state to mem to avoid classlist change if same state.
 */
async function showRecorderActive() {
  const volumeSlider = document.getElementById("audioVolume");
  const recorderArray = await getIndex({
    dbName: "app_db",
    store: "downloader",
  });
  if (recorderArray.length > 0) {
    // Active recorder found.
    volumeSlider.classList.remove("slider_neutral");
    volumeSlider.classList.add("slider_record");
  } else {
    // No recorder active.
    volumeSlider.classList.remove("slider_record");
    volumeSlider.classList.add("slider_neutral");
  }
}
