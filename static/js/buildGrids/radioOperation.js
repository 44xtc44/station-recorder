// radioOperation.js
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
 */

import { recMsg } from "../network/messages.js";
import { metaData } from "../central.js";
import { getIndex } from "../database/idbSetGetValues.js";
import { runMetaAndRecord } from "../network/runner.js";
import { submitStationClicked } from "../network/publicDbCom.js";

export {
  switchRecorderState,
  removeAllRecorder,
  recBtnColorOn,
  showRecorderActive,
};

/**
 * Switch a single recorder state.
 * Send click to public DB. Votes badge is hidden, during recording.
 * "streamDataGet.js" writes a running recorder id into indexed DB.
 * @param {string} stationuuid
 */
function switchRecorderState(stationuuid) {
  return new Promise((resolve, _) => {
    const stationObj = metaData.get().infoDb[stationuuid];
    const recBtn = document.getElementById("divBoxRecord_" + stationuuid);

    if (!stationObj.isRecording) {
      metaData.set().infoDb[stationuuid].isRecording = true; // rec listen to run further
      metaData.set().infoDb[stationuuid].isListening = true;

      submitStationClicked(stationuuid, stationObj.id);
      // stream meta (text) and stream byte data (uint8array s)
      runMetaAndRecord(stationuuid);
      recBtnColorOn(recBtn, true);
      // Hide votes badge.
      document.getElementById("divVotesBadge_" + stationuuid).style.display =
        "none";
    } else {
      metaData.set().infoDb[stationuuid].isActive = false; // runner.js fetch prevent double
      metaData.set().infoDb[stationuuid].isRecording = false; // rec listen to stop
      metaData.set().infoDb[stationuuid].isListening = false;
      recBtnColorOn(recBtn, false);
      // Show votes badge.
      document.getElementById("divVotesBadge_" + stationuuid).style.display =
        "block";
    }
    resolve();
  });
}

/**
 * Reord button style.
 * @param {HTMLObjectElement} recBtn
 * @param {boolean} isActive
 */
function recBtnColorOn(recBtn, isActive) {
  if (isActive) {
    recBtn.style.color = "teal"; // #0c3958
  } else {
    // refac Uncaught (in promise) TypeError: can't access property "style", recBtn is null
    /**
     * recBtnColorOn moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/radioOperation.js:68
    switchRecorderState moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/radioOperation.js:51
    switchRecorderState moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/radioOperation.js:33
    createActivityBar moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/streamActivity.js:88
    createActivityBar moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/streamActivity.js:87
    prepDownload moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/streamDataGet.js:160
    prepDownload moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/streamDataGet.js:143
    consumeStream moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/streamDataGet.js:63
    res moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/runner.js:107
    promise callback*streamData moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/runner.js:106
    runMetaAndRecord moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/runner.js:59
    setTimeout handler*runMetaAndRecord moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/network/runner.js:57
    switchRecorderState moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/radioOperation.js:43
    switchRecorderState moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/radioOperation.js:33
    recordBoxListener moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/createRadioListener.js:61
    recordBoxListener moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/createRadioListener.js:60
    waitGridReady moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/stationContainer.js:270
    populateOneGrid moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/stationContainer.js:288
    populateOneGrid moz-extension://6f22d837-66c4-4245-ad0c-d8922984e675/static/js/buildGrids/stationContainer.js:257
     */
    recBtn.style.color = "black";
  }
}

/**
 * refac shoud be module in menu folder
 * @param {*} o
 */
async function removeAllRecorder() {
  let count = 0;
  const promiseArray = Object.values(metaData.get().infoDb).map(
    (stationObj) => {
      return new Promise((resolve, _) => {
        const wait = async () => {
          if (stationObj.isRecording) {
            count++;
            await switchRecorderState(stationObj.stationuuid).catch((e) => {
              const msg =
                "catch->stop recorder" + stationObj.id + e.message;
              resolve(msg);
            });
          }
          resolve();
        };
        wait();
      });
    }
  );
  // 'undefined' is listed multiple times if the stopping was a success, else error
  const results = await Promise.all(promiseArray);

  const badResults = results.filter((result) => result instanceof Error);
  recMsg(["stop all recorder", count + " done"]);

  if (badResults.length > 0) {
    recMsg(["stop all recorder :: error"]);
  }
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
