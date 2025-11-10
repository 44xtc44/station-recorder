// idbInitDb.js
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

import { setIdbValue } from "./idbSetGetValues.js";
export { createIndexedDb, logAllDbVersions };

// https://gist.github.com/JamesMessinger/a0d6389a5d0e3a24814b no libs
// https://stackoverflow.com/questions/47838111/whats-the-purpose-of-keypath-in-idbobjectstore-createindex idx

/**
 * Init a named DB.
 * Read the version number of db.
 * Read all object stores of db.
 * Have an option to create a new and delete an object store.
 * Update the version number of schema.
 * Use always 'put' and not 'add' to init the fields. Save head aches.
 * One can use objectStore directly or an Index to ask for data.
 * Index access is faster.
 * An in mem array of selected keys from the object store, maintained by the DB.
 */

/**
 * This guy can create a DB and object stores, single or batch mode.
 * We have to upgrade the version of a DB, if a new objecStore is created.
 * Therefore DB version number must be read before insertion.
 * @param {*} options
 * @returns {Promise} version (upgraded), false (version num too small), error (store exists)
 */
function createIndexedDb(options = {}) {
  // Promise to schedule app state update fun.
  const dbName = options.dbName;
  const dbVersion = options.dbVersion;
  const storeName = options.storeName;
  const primaryKey = options.primaryKey;
  const indexNames = options.indexNames;
  const objStores = options.objStores;

  return new Promise((resolve, _) => {
    const open = indexedDB.open(dbName, dbVersion);

    open.onerror = (event) => {
      /* version of db to open is higher now than requested */
      resolve(event.target.error);
    };

    // createObjectStore, createIndex
    open.onupgradeneeded = function (event) {
      const db = event.target.result;
      db.onerror = (event) => console.error(event.target.error);

      if (options.batchCreate) {
        // {1: {storeName: "dbVersions", primaryKey: "id",indexNames: ["dbVersionsIdx", "id"],},}

        const keyCount = Object.keys(objStores).length;
        // no map, need sequential creation to be sure finished at transaction end
        for (const [index, objVal] of Object.values(objStores).entries()) {
          const objStoreName = objVal.storeName;

          let store = null;
          if (objStoreName !== undefined) {
            try {
              store = db.createObjectStore(objStoreName, {
                keyPath: "id",
                // https://stackoverflow.com/questions/20078724/delete-method-is-not-working-for-indexed-db-html5-it-returns-success-but-the
                // underflow not working
                autoIncrement: true,
              });
            } catch (e) {
              console.error("batch create objStore fail", objVal, e);
              resolve(false);
            }
            if (store !== null) {
              const idxName = objVal.indexNames[0];
              const keyPath = objVal.indexNames[1];
              store.createIndex(idxName, keyPath);

              // resolve on last store creation?
              if (index === keyCount - 1) {
                /* May not resolve here. 
                   Store creation is finished at transaction success.
                */
              }
            }
          }
        }
      }

      if (options.batchCreate === undefined || !options.batchCreate) {
        if (storeName === undefined) {
          console.error("storeName === undefined->");
          resolve();
        }
        let store = null;
        try {
          store = db.createObjectStore(storeName, {
            keyPath: primaryKey,
            autoIncrement: false,
          });
        } catch (e) {
          console.error("db.createObjectStore->", e);
          resolve();
        }

        if (store !== null) {
          // indexNames: ["BlacklistIdx", "title"]
          const idxName = indexNames[0];
          // the key used as primary key {title: "foo - plays bar"}
          const keyPath = indexNames[1];
          store.createIndex(idxName, keyPath);
        }
      }
    };
    // db and store creation is finished at transaction end
    open.onsuccess = function () {
      const db = open.result;
      // db ver plus one to add new objectstore; -> onupgradeneeded
      db.close(); // Placebo! see documentation, needs evt listener
      resolve(open.result.version);
    };
  });
}

function logAllDbVersions() {
  return new Promise(async (resolve, _) => {
    const databases = await indexedDB.databases();
    // [{name: "app_db", version: 1}, ...]
    for (const db of databases) {
      await setIdbValue({
        dbName: "versions_db",
        dbVersion: 1,
        objectStoreName: "dbVersions",
        data: {
          id: db.name,
          dbVersion: db.version,
        },
      }).catch((e) => {
        console.error("logAllDbVersions->", e);
      });
    }
    resolve();
  });
}
