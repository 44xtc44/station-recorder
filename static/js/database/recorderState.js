// recorderState.js
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
 * Write station name, uuid to object store to keep track of current downloaders.
 */

import {
  getIdbValue,
  setIdbValue,
  setPropIdb,
  getPropIdb,
  delPropIdb,
} from "./idbSetGetValues.js";
import { createIndexedDb, logAllDbVersions } from "./idbInitDb.js";
import { activityBar } from "../recordPlay/streamActivity.js";

export {
  stationDbCreate,
  dbRegisterStreamer,
  registerAsDownloder,
  deleteAsDownloder,
  getDumpIncompleteFiles,
};

/**
 * Need a DB for each recorder.
 * A store for file blobs and a store for blacklist in the DB.
 *
 * Tried all recorder object store creation under a DB.
 * But mass (2+) object store creation will block a long time until return.
 * So the app is hanging around until writes to store are possible or
 * the next recorder button press can be accepted.
 * @param {string} stationuuid str
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
 * @param {string} stationuuid str
 * @param {string} stationName str
 * @returns {Promise<boolean>} Promise bool true || false
 */
function dbRegisterStreamer(stationuuid, stationName) {
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
      data: { id: stationuuid, name: stationName },
    }).catch((e) => {
      console.error("dbRegisterStreamer->set", e);
      resolve(false);
    });
    resolve(true);
  });
}

/**
 * Current downloader stations.
 * (A) Communication with other threads and
 * to write messages and current title to the UI.
 *
 * (B) blockAccess to 'World' huge data filter,
 * as long as threre is no separate process for download.
 * @param {string} stationuuid str
 * @returns {Promise<boolean>} Promise bool true || false
 */
function registerAsDownloder(stationuuid) {
  return new Promise(async (resolve, _) => {
    await setPropIdb({
      idbDb: "app_db",
      idbStore: "downloader",
      idbData: { id: stationuuid },
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
 * @param {string} stationuuid str
 * @returns {Promise<boolean>} Promise bool true || false
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
 * @returns {Promise<Object>} Promise { id: "fileIncomplete", isActive: false }
 */
async function getDumpIncompleteFiles() {
  const dumpIncomplete = await getPropIdb({
    idbDb: "app_db",
    idbStore: "appSettings",
    idbId: "fileIncomplete",
  }).catch(() => {
    return { id: "fileIncomplete", isActive: false }; // transaction error, key not in store
  });
  return dumpIncomplete;
}
