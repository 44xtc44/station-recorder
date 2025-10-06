// update_radio_browser_info.js
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

import { gzDecomp } from "../utils/gzDecomp.js";
import { sleep } from "../uiHelper.js";
import { metaData } from "../central.js";
import { urlAlive } from "../network/streamDetect.js";
import { showDbpdateUi } from "./update_ui.js";
import { setIdbValue, getIdbValue } from "../database/idbSetGetValues.js";
import {
  waitTimeRadioBrowserInfo,
  appUserAgent,
  gzJsonBkpRadioBrowserInfo,
} from "../constants.js";

export { updateRadioBrowserInfoDb };

function readTimeStampDl() {
  return new Promise(async (resolve, _) => {
    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });

    const milliSec = await getIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      id: "radio_browser_info_db_time_stamp",
    }).catch(() => resolve(false));
    resolve(milliSec);
  });
}

function writeTimeStampDl() {
  return new Promise(async (resolve, _) => {
    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });
    // new radio 'objects' db, load at app start
    await setIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      data: {
        id: "radio_browser_info_db_time_stamp",
        updateTime: Date.now(),
      },
    }).catch((e) => {
      console.error("radio_browser_info_db_time_stamp write", e);
    });
    resolve();
  });
}

function writeToObjStore(newJsonDb) {
  return new Promise(async (resolve, _) => {
    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });
    // new radio 'objects' db, load at app start
    await setIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      data: { id: "radio_browser_info_db", add: newJsonDb },
    }).catch((e) => {
      console.error("update_radio_browser_info write db", e);
    });
    resolve();
  });
}

/**
 * Pull radio objects from API, latest backup of the database "JSON" format.
 * Download in chunks to have a status bar.
 *
 * Decomp and rebuild the file blob as JSON.
 * @param {string} gzJsonBkpRadioBrowserInfo URL
 * @param {HTMLDivElement} uiObj draw a status bar
 * @returns {JSON<blob>}
 */
function downloadRemoteJson(gzJsonBkpRadioBrowserInfo, uiObj) {
  return new Promise(async (resolve, _) => {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    abortSignal.addEventListener("abort", () => {});
    const addHeaders = new Headers();
    addHeaders.append("User-Agent", appUserAgent);

    const statusBar = document.createElement("div");
    statusBar.style.backgroundColor = "#6261cb";
    statusBar.style.boxShadow = "rgb(81, 48, 69) 0px 0px 10px inset";
    statusBar.style.height = "20px";
    statusBar.style.width = "0%";
    uiObj.dbUpdHint.appendChild(statusBar);

    const fetchOpt = {
      method: "GET",
      mode: "cors",
      signal: abortSignal, // may implement button to abort
      headers: addHeaders,
    };

    await fetch(gzJsonBkpRadioBrowserInfo, fetchOpt)
      .then((response) => {
        const streamReader = response.body.getReader();
        // No content-length, no status bar. Some server don't send it.
        const contentLength = response.headers.get("Content-length");
        // Server sends "application-octet-stream" for a .gz file.
        let receivedLength = 0;
        const chunkArray = [];

        // sanitize html, test it before upload with "web-ext lint" (have warnings)
        const parser = new DOMParser(); // mixed html with dyn. vars

        const waitJson = async () => {
          while (true) {
            const nextChunk = await streamReader.read();

            if (nextChunk.done) break;
            const chunk = nextChunk.value;
            chunkArray.push(chunk); // uint8array
            receivedLength += chunk.length;
            statusBar.style.width =
              (receivedLength / contentLength) * 100 + "%";

            // sanitizer, prevent malicious code, should be outsourced module
            const msgStr = `Received ${receivedLength} bytes`;
            const parsed = parser.parseFromString(msgStr, "text/html");
            const msgTags = parsed.getElementsByTagName("body");
            let count = 0
            for (const tag of msgTags) {
              // flaw, updated length info stacked, not overwritten
              uiObj.dbUpdInfoBlock.appendChild(tag);
              console.log("count->", count)
              count++
            }
          }

          // Process assambled uint8array to decompressed binary data
          // contained in an ArrayBuffer.
          let gzBlob = await gzDecomp(chunkArray);
          // File like object that we could dump to users fs.
          let blob = new Blob([gzBlob], { type: "application/json" });
          // JSON object to JavaScript Object for further processing (dictionaries).
          const commit = JSON.parse(await blob.text());

          blob = null;
          resolve(commit);
        };
        waitJson();
      })
      .catch(() => resolve(false));
  });
}

/**
 * Allow update after waitTime in ms.
 * @returns
 */
async function updateRadioBrowserInfoDb() {
  const waitTime = waitTimeRadioBrowserInfo;
  await showDbpdateUi();
  const uiObj = {
    dbUpdHead: document.getElementById("dbUpdHead"),
    dbUpdHint: document.getElementById("dbUpdHint"),
    dbUpdInfoBlock: document.getElementById("dbUpdInfoBlock"),
    dbUpdClose: document.getElementById("dbUpdClose"),
  };

  let timeObj = await readTimeStampDl();
  if (!timeObj) timeObj = { updateTime: "0" };
  const milliSec = timeObj.updateTime;
  const passedTime = Date.now() - milliSec;
  if (passedTime < waitTime) {
    const timeDenied = waitTime - passedTime;
    const timeLeft = convertToDays(timeDenied);
    const msgTimeLeft = `You have to wait  ${timeLeft.days} days ${timeLeft.hours} h : ${timeLeft.minutes} min`;

    uiObj.dbUpdHead.innerText = msgTimeLeft;
    uiObj.dbUpdClose.style.display = "inline-block";
    return;
  }

  uiObj.dbUpdHead.innerText = "Check server is online.";
  uiObj.dbUpdHint.innerText = "";
  const isAlive = await urlAlive(gzJsonBkpRadioBrowserInfo);
  if (!isAlive) {
    uiObj.dbUpdHint.innerText = "Fail. No server response.";
    uiObj.dbUpdClose.style.display = "inline-block";
    return;
  }

  uiObj.dbUpdHead.innerText = "Receive public database backup.";
  uiObj.dbUpdHint.innerText = "Server: " + gzJsonBkpRadioBrowserInfo;

  const remoteJson = await downloadRemoteJson(gzJsonBkpRadioBrowserInfo, uiObj);
  if (remoteJson === false) {
    uiObj.dbUpdHint.innerText = "Fail. Unknown error.";
    uiObj.dbUpdClose.style.display = "inline-block";
    return; // explicit false, else JSON for Indexed DB
  }

  await writeTimeStampDl();
  await sleep(3000); // User can read the infos.

  await writeToObjStore(remoteJson);
  uiObj.dbUpdHead.innerText = "";
  uiObj.dbUpdHint.innerText = "";
  uiObj.dbUpdInfoBlock.innerText = "Reload the app to activate the changes.";
  uiObj.dbUpdClose.style.display = "inline-block";
}

function convertToDays(milliSeconds) {
  let days = Math.floor(milliSeconds / (86400 * 1000));
  milliSeconds -= days * (86400 * 1000);
  let hours = Math.floor(milliSeconds / (60 * 60 * 1000));
  milliSeconds -= hours * (60 * 60 * 1000);
  let minutes = Math.floor(milliSeconds / (60 * 1000));
  return {
    days,
    hours,
    minutes,
  };
}
