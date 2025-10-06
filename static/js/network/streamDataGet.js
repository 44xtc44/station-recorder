// streamDataGet.js
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

// https://stackoverflow.com/questions/7255719/
// downloading-binary-data-using-xmlhttprequest-without-overridemimetype^
// read stream as blob
// https://reference.codeproject.com/dom/xmlhttprequest/sending_and_receiving_binary_data
// https://stackoverflow.com/questions/58088831/arraybuffer-has-no-data-when-using-the-incoming-data
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream
// https://clicktorelease.com/blog/loading-sounds-faster-using-html5-web-audio-api/
// https://gist.github.com/niko/2a1d7b2d109ebe7f7ca2f860c3505ef0   metadata within the stream from an icecast server
// file write no URL https://stackoverflow.com/questions/6076047/create-a-download-link-from-a-blob-url

import { recMsg } from "./messages.js";
import { metaData } from "../central.js";
import {
  getIdbValue,
  setIdbValue,
  setPropIdb,
  getPropIdb,
  delPropIdb,
} from "../database/idbSetGetValues.js";
import { writeBlacklist } from "../fileStorage/blacklist.js";
import { createIndexedDb, logAllDbVersions } from "../database/idbInitDb.js";
import { writeFileLocal, storeBlobAsObj } from "../fileStorage/fileStorage.js";
import { createActivityBar } from "./streamActivity.js";
// import { runFeedMedia } from "./directAudio.js"; // import triggers setInterval

export { consumeStream, stationDbCreate, dbRegisterStreamer };

/**
 * Get stream to store.
 * @param {*} options
 *
 * @returns
 */
async function consumeStream(o = {}) {
  let stationuuid = o.stationuuid;
  const stationObj = metaData.get().infoDb[stationuuid];
  const stationName = stationObj.name;
  let bitRate = stationObj.bitRate;
  if (bitRate === null) bitRate = "";
  let targetLen = stationObj.chunkSize;
  if (targetLen === undefined || targetLen === null) targetLen = 16000;

  const streamReader = o.streamReader;
  const contentType = o.contentType;
  const abortController = o.abortController;

  let chunkArray = [];
  let count = 0;
  const noTitleMsg = "no_title";
  let titleToWrite = noTitleMsg;

  if (stationuuid === undefined) {
    stationuuid = "sr-custom-" + stationName;
  }

  const prep = await prepDownload(stationuuid, stationName);
  const dumpIncomplete = prep.dumpIncomplete;
  const activityDiv = prep.activityDiv;

  /* Media stream buffer to feed audio or video DOM element.
    Planned is static object url with dynamic fed var of new responses.
  */
  // metaData.set().infoDb[stationuuid].mediaBucket = {
  //   headers: o.headers,
  //   streamChunks: [],
  // };
  // runFeedMedia(stationuuid); // workon feed audio from fetch stream

  while (true) {
    let nextChunk = await streamReader.read(targetLen); // chumk can be less than targeLen!
    if (nextChunk.done) {
      recMsg(["stream abort ::, connect rejected", stationName]);
      break; // radio killed our connection
    }

    let chunk = nextChunk.value;
    chunkArray.push(chunk);
    /**
     * Feed audio element directly from stream. Copy of the recorder chunks.
     * Store it in station object to be independent from deleted recorder chunks.
     * import { runFeedMedia } from "./directAudio.js"; processes the audio chunks
     */
    // metaData.set().infoDb[stationuuid].mediaBucket.streamChunks.push(chunk);

    // refac if worker communication, check 'downloads' store or pub DB store, if ready
    const titleInDisplay = metaData.get().infoDb[stationuuid].textMsg;
    if (titleToWrite !== titleInDisplay && titleInDisplay !== "") {
      if (titleToWrite !== noTitleMsg && count > 1) {
        const isBlacklisted = await writeBlacklist(stationuuid, titleToWrite);
        if (isBlacklisted) {
          // refac if worker communication, check 'downloads' store or pub DB store, if ready
          recMsg(["skip-blacklisted  ", stationName, titleToWrite]);
        }
        if (!isBlacklisted) {
          await storeBlobAsObj({
            chunkArray: chunkArray,
            contentType: contentType,
            title: titleToWrite,
            bitRate: bitRate,
            radioName: stationName,
            stationuuid: stationuuid,
          });
        }

        chunkArray = [];
      } else {
        // skip predefined dummy and incomplete first file,
        recMsg(["skip incomplete ", stationName, titleToWrite]);
      }
      titleToWrite = titleInDisplay;
      count += 1;
    }
    chunk = null;
    nextChunk = null;

    // refac if worker communication, check 'downloads' store or pub DB store, if ready
    if (!metaData.get().infoDb[stationuuid].isRecording) {
      activityDiv.remove();
      abortController.abort();
      deleteAsDownloder(stationuuid);
      // refac if worker communication, check 'downloads' store or pub DB store, if ready
      recMsg(["exit stream ", stationName]);
      if (dumpIncomplete.isActive === true) {
        // forced in 'appsettings' 'fileIncomplete' menu
        // refac if worker communication, dl is impossible from worker (DOM elem)
        // better write to blob store
        await writeFileLocal({
          chunkArray: chunkArray,
          contentType: contentType,
          title: "_incomplete_" + Date.now(),
          bitRate: bitRate,
          radioName: stationName,
        });
        chunkArray = [];
        break;
      }
    }
  }
}

function prepDownload(stationuuid, stationName) {
  return new Promise(async (resolve, _) => {
    const created = await stationDbCreate(stationuuid);
    if (!created) {
      // refac if worker communication, mainthread writes
      recMsg(["stream abort ::, DB creation fail", stationName]);
      return;
    } else {
      // Permanent store uuid, name for backup of blackists.
      await dbRegisterStreamer(stationuuid, stationName);
      // Thread communication and UI messages via object store.
      await registerAsDownloder(stationuuid);
      //    Msg write now possible.
    }
    // refac if worker communication, mainthread writes
    recMsg(["stream record ", stationName]);
    const dumpIncomplete = await getDumpIncompleteFiles(); // is setting active
    // refac if worker communication, mainthread loop check 'downloads' store, put in RUNNER
    const activityDiv = createActivityBar(stationuuid, stationName); // rec name under monitor
    resolve({ dumpIncomplete: dumpIncomplete, activityDiv: activityDiv });
  });
}

/**
 * Create a station store for file blobs and a store for blacklist.
 * @param {string} stationuuid
 * @returns {Promise} ok
 */
function stationDbCreate(stationuuid) {
  return new Promise(async (resolve, _) => {
    // Get an object or transaction error from version DB. (all DB ver logged)
    const created = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: stationuuid,
    }).catch((e) => {
      return e;
    });

    if (created === "FAIL_NO_DATA_IN_STORE") {
      // The two stores.
      const objStores = [
        {
          storeName: "blacklist_names",
          primaryKey: "id",
          indexNames: ["blacklist_namesIdx", "id"],
        },
        {
          storeName: "content_blobs",
          primaryKey: "id",
          indexNames: ["content_blobsIdx", "id"],
        },
      ];
      await createIndexedDb({
        dbName: stationuuid,
        dbVersion: 1,
        batchCreate: true,
        objStores: objStores,
      }).catch((e) => {
        console.error("stationDbCreate->", e);
        resolve(false);
      });
      // Write version of all DBs to 'versions_db' / 'dbVersions'.
      await logAllDbVersions();
      resolve(true); // db + stores created
    }
    resolve(true); // 'created' is an object, nothing to do
  });
}

/**
 * Register the station name with uuid to have all stream reader in an array.
 * Needed for backup, restore of blacklists.
 * @param {string} stationuuid
 * @param {string} station name
 * @returns {Promise} ok
 */
function dbRegisterStreamer(stationuuid, station) {
  return new Promise(async (resolve, _) => {
    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "app_db",
    }).catch((e) => {
      console.error("dbRegisterStreamer->get", e);
    });
    await setIdbValue({
      dbName: "app_db",
      dbVersion: db.dbVersion,
      objectStoreName: "uuid_name_dl",
      data: { id: stationuuid, name: station },
    }).catch((e) => {
      console.error("dbRegisterStreamer->set", e);
      resolve(false);
    });
    resolve(true);
  });
}

/**
 * ---> worker setup and call in RUNNER
 * Current downloader stations.
 * (A) Communication with other threads and
 * to write messages and current title to the UI.
 *
 * (B) blockAccess to 'World' huge data filter,
 * as long as threre is no separate process for download.
 * @param {string} stationuuid
 * @param {string} station name
 * @returns {Promise} ok
 */
function registerAsDownloder(stationuuid) {
  return new Promise(async (resolve, _) => {
    await setPropIdb({
      idbDb: "app_db",
      idbStore: "downloader",
      idbData: metaData.get().infoDb[stationuuid], // whole object
    }).catch((e) => {
      console.error("registerAsDownloder->set", e);
      resolve(false);
    });
    resolve(true);
  });
}

/**
 * Current downloader stations.
 * Needed to blockAccess to 'World' huge data filter,
 * as long as threre is no separate process for network.
 * @param {string} stationuuid
 * @returns {Promise} ok
 */
function deleteAsDownloder(stationuuid) {
  return new Promise(async (resolve, _) => {
    await delPropIdb({
      idbDb: "app_db",
      idbStore: "downloader",
      idbData: { id: stationuuid }, // omit if clearAll
      clearAll: false, // can also omit this prop
    }).catch((e) => {
      console.error("deleteAsDownloder->set", e);
      resolve(false);
    });
    resolve(true);
  });
}

/**
 * Ask if we should dump incomplete files.
 * @returns
 */
function getDumpIncompleteFiles() {
  return new Promise(async (resolve, _) => {
    const dumpIncomplete = await getPropIdb({
      idbDb: "app_db",
      idbStore: "appSettings",
      idbId: "fileIncomplete",
    }).catch((e) => {
      return e; // transaction error, key not in store
    });
    resolve(dumpIncomplete);
  });
}
