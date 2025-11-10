// idbSetGetValues.js
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

import { metaData } from "../central.js";

export {
  setIdbValue,
  getIdbValue,
  delIdbValue,
  getIndex,
  objectStoresGet,
  objectStoreCreate,
  delOneKeyFromDbStore,
  setPropIdb,
  getPropIdb,
  delPropIdb,
};

function delKey(o = {}) {
  return new Promise((resolve, _) => {
    resolve();
  });
}

/**
 * @example
 */

function delIdbValue(options = {}) {
  return new Promise((resolve, reject) => {
    const clearAll = options.clearAll;
    const conOpen = indexedDB.open(options.dbName, options.dbVersion);
    conOpen.onerror = (event) => reject(event.target.error);
    conOpen.onsuccess = () => {
      const db = conOpen.result;
      let isConnected = true;
      let transact = null;
      let store = undefined;
      let objectStoreRequest = null;

      try {
        transact = db.transaction(options.objectStoreName, "readwrite");
      } catch (e) {
        reject("FAIL_TRANSACT_NOSTORE");
        isConnected = false;
      }
      if (isConnected) {
        transact.onerror = () => {
          reject("FAIL_TRANSACT_CONNECT");
          isConnected = false;
        };
      }
      if (isConnected) store = transact.objectStore(options.objectStoreName);

      // single
      if (clearAll === undefined || clearAll === false) {
        objectStoreRequest = store.delete(options.data.id);
        transact.oncomplete = () => {
          resolve();
        };
      }

      // bulk over map or for( of) hangs if called from worker
      if (clearAll === true) {
        store.clear();
        transact.oncomplete = () => {
          resolve();
        };
      }
    };
  });
}

/**
 * Write data to IndexedDB.
 * @param options.dbName dbName
 * @param options.dbVersion dbVersion
 * @param options.objectStoreName objectStoreName
 * @param options.data dictionary with data row to update, whole row
 * @param options.updFields dictionary with data, selective update fields (key:val)
 * @returns {Promise} true or error object
 * @example
 * setIdbValue({
 *   // db transaction, update if country is done
 *   dbName: bubbleObj.logDbFetched,
 *   dbVersion: 1,
 *   objectStoreName: bubbleObj.objectStoreName,
 *   data: {
 *     id: bubbleObj.year,
 *     country: [...result.country, bubbleObj.country],
 *   },
 * });
 */
function setIdbValue(options = {}) {
  const updFields = options.updFields; // may contain one or more fields
  return new Promise((resolve, reject) => {
    const conOpen = indexedDB.open(options.dbName, options.dbVersion);
    conOpen.onerror = (event) => reject(event.target.error);
    conOpen.onsuccess = () => {
      const db = conOpen.result;
      let isConnected = true;
      let transact = null;
      let store = undefined;
      let objectStoreRequest = null;
      try {
        transact = db.transaction(options.objectStoreName, "readwrite");
      } catch (e) {
        reject("FAIL_TRANSACT_NOSTORE");
        isConnected = false;
      }
      if (isConnected) {
        transact.onerror = () => {
          reject("FAIL_TRANSACT_CONNECT");
          isConnected = false;
        };
      }
      if (isConnected) store = transact.objectStore(options.objectStoreName);

      // single
      if (
        options.bulkInsert === undefined &&
        !options.bulkInsert &&
        store !== undefined
      ) {
        objectStoreRequest = store.put(options.data);

        transact.oncomplete = () => {
          resolve();
        };
      }

      // bulk
      if (
        options.bulkInsert &&
        store !== undefined &&
        options.data !== undefined
      ) {
        // next store row with next list obj
        if (options.data.length > 0) {
          options.data.map((obj, idx) => {
            const dataLength = options.data.length - 1;
            store.put(obj);

            if (idx === dataLength) {
              transact.oncomplete = () => {
                resolve(true);
              };
            }
          });
        }
      }
    };
  });
}

/**
 * Get the data row with a given 'id'.
 * @param options.dbName  dbName
 * @param options.dbVersion dbVersion
 * @param options.objectStoreName objectStoreName
 * @param options.id primary key for a paricular row, i.e. "2022"
 * @param options.index name of index to get all key: val pairs
 * @param options.callback fun to transport value out of promise
 * @returns {Promise.resolve(data)} .then((data) => ...) data{id:2022,power:true,band:3,...}
 * @example
 * getIdbValue({
 *  dbName: "de",
 *  dbVersion: 1,
 *  objectStoreName: "production_types",
 *  id: "2023",
 *  callback: (data) => dataCall.set(data, "de", "2023"),
 * });
 */
function getIdbValue(options = {}) {
  // Promise does not stop, have to fall through.
  return new Promise((resolve, reject) => {
    const conOpen = indexedDB.open(options.dbName, options.dbVersion);
    conOpen.onerror = () => reject("FAIL_DBOPEN");

    conOpen.onsuccess = () => {
      const db = conOpen.result;
      let isConnected = true;
      let transact = null;
      try {
        transact = db.transaction(options.objectStoreName);
      } catch (e) {
        reject("FAIL_TRANSACT_NOSTORE");
        isConnected = false;
      }
      if (isConnected) {
        transact.onerror = () => {
          reject("FAIL_TRANSACT_CONNECT");
          isConnected = false;
        };
      }
      if (isConnected) {
        const store = transact.objectStore(options.objectStoreName);
        let data = null;
        let storeIndex = null;
        let getAllRequest = null;
        if (options.index !== undefined) {
          storeIndex = store.index(options.index);
          getAllRequest = storeIndex.getAll();
          getAllRequest.onsuccess = () => {
            // all keys, slower
            resolve(getAllRequest.result);
          };
        }
        if (options.id !== undefined) {
          data = store.get(options.id);
          data.onsuccess = () => {
            // one key
            const dataResult = data.result;
            if (dataResult === undefined) reject("FAIL_NO_DATA_IN_STORE");
            if (options.callback !== undefined) options.callback(dataResult);
            resolve(dataResult);
          };
          data.onerror = (event) => {
            reject(event.target.error);
          };
        }
      }
    };
  });
}

/**
 * Provide an array of objects.
 * @param {*} options
 * @example
 * const dlArray = await getIndex({ dbName: "app_db", store: "downloader" });
 */
function getIndex(options = {}) {
  // all idx made <store name>Idx
  return new Promise((resolve, _) => {
    const index = async () => {
      const db = await getIdbValue({
        dbName: "versions_db",
        dbVersion: 1,
        objectStoreName: "dbVersions",
        id: options.dbName,
      }).catch((e) => {
        return e;
      });
      // console.log("getIndex->db", db);
      const result = await getIdbValue({
        dbName: db.id,
        dbVersion: db.dbVersion,
        objectStoreName: options.store,
        // use id: to get one key, index: all keys
        index: options.store + "Idx",
      }).catch((e) => {
        /* console.log("getIndex->catch", db.id, db.dbVersion, options.store, e) */
        return e;
      });
      resolve(result);
    };
    index();
  });
}

function objectStoresGet(options = {}) {
  return new Promise((resolve, reject) => {
    const conOpen = indexedDB.open(options.dbName, options.dbVersion);
    conOpen.onerror = (event) => reject(event.target.error);
    conOpen.onsuccess = () => {
      const db = conOpen.result;
      resolve(db.objectStoreNames);
    };
  });
}

/**
 * Test and future use if indexed DB closes faster.
 * Now it takes about 30 to 60 seconds.
 * @param {*} o 
 * @returns
 * @example
 * const wait = async () => {
 * objectStoreCreate({
 *       dbName: "radio_index_db",
 *       // run getIdbValue() on versions_db, store db_verions before
 *       dbVersion: version.dbVersion, 
 *       storeName: storeName,
 *       indexNames: [storeName + "Idx", "id"],
 *     })
 *   }
 * wait()
 *        
 
 */
function objectStoreCreate(o = {}) {
  return new Promise((resolve, _) => {
    const dbName = o.dbName;
    const dbVersion = o.dbVersion;
    const storeName = o.storeName;
    const indexNames = o.indexNames;
    const objStores = o.objStores; // multiple stores list; in one DB

    const open = indexedDB.open(dbName, dbVersion + 1);
    open.onerror = (event) => {
      /* version of db to open is higher now than requested */
      resolve(event.target.error);
    };

    // Create the schema
    open.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.onerror = (event) => console.error(event.target.error);
      console.log(",,,onsuccess,,,,,,,testDataBase->", db);

      const store = db.createObjectStore(storeName, {
        keyPath: "id", // primary key
        autoIncrement: false,
      });
      const idxName = indexNames[0];
      const keyPath = indexNames[1];
      store.createIndex(idxName, keyPath);
    };
    open.onsuccess = (event) => {
      const db = event.target.result;
      // Start a new transaction to verify existens and keep DB open.
      const tx = db.transaction(storeName, "readwrite");
      // Close the db when the transaction is done. For the next creation.
      tx.oncomplete = () => {
        db.close();
        metaData.set()["blacklistContenDbOpen"] = false;
        resolve();
      };
    };
  });
}

/**
 * Del a key from any DB store. DB must be registered in 'versions_db'
 * @param {*} dbId DB can be any name
 * @param {*} objectStoreName store, any name
 * @param {*} keyId key must be "id: foo"
 * @returns {Promise}
 */
function delOneKeyFromDbStore(dbId, objectStoreName, keyId) {
  return new Promise(async (resolve, _) => {
    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: dbId,
    });
    await delIdbValue({
      dbName: dbId,
      dbVersion: db.dbVersion,
      objectStoreName: objectStoreName,
      data: { id: keyId },
    });
    resolve();
  });
}

/**
 * Replace the get version -> set value mess
 * in the modules with the more compact funs.
 * At refac, for readability.
 */

/**
 * Set property with integrated table version
 * getter to stay independent from future DB
 * version upgrades.
 * @param {string} idbDb name
 * @param {string} idbStore name
 * @param {Object} idbData {id: stationuuid, name: foo,}
 * @returns {Promise} whole object or transaction error, key not in store
 * @example
 * await setPropIdb({
 *      idbDb: "app_db",
 *      idbStore: "downloader",
 *      idbData: metaData.get().infoDb[stationuuid], // whole object
 *    })
 */
function setPropIdb(o = {}) {
  return new Promise(async (resolve, _) => {
    const idbDb = o.idbDb;
    const idbStore = o.idbStore;
    const idbData = o.idbData;

    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: idbDb,
    }).catch((e) => {
      console.error("setPropIdb->get", e);
      resolve(false);
    });
    const value = await setIdbValue({
      dbName: idbDb,
      dbVersion: version.dbVersion,
      objectStoreName: idbStore,
      data: idbData, // must include {id: foo}
    }).catch((e) => {
      console.error("setPropIdb->set", e);
      resolve(false);
    });
    resolve(true);
  });
}

/**
 * Get property/object with integrated table version
 * getter to stay independent from future DB
 * version upgrades.
 * @param {string} idbDb name
 * @param {string} idbStore name
 * @param {Object} idbId stationuuid
 * @returns {Promise} whole object w. props
 * @example
 * const dumpIncomplete = await getPropIdb({
 *      idbDb: "app_db",
 *      idbStore: "appSettings",
 *      idbId: "fileIncomplete",
 *    })
 */
function getPropIdb(o = {}) {
  return new Promise(async (resolve, _) => {
    const idbDb = o.idbDb;
    const idbStore = o.idbStore;
    const idbId = o.idbId;

    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: idbDb,
    }).catch((e) => {
      console.error("getPropIdb->getVer", e);
      resolve(false);
    });

    const value = await getIdbValue({
      dbName: idbDb,
      dbVersion: version.dbVersion,
      objectStoreName: idbStore,
      id: idbId,
    }).catch((e) => {
      // No console, work with the error FAIL_NO_DATA_IN_STORE.
      resolve(false);
      return e; // error for if(exist a key)
    });
    resolve(value);
  });
}

/**
 * Delete a key or all in the store
 * with integrated table version
 * getter to stay independent from future DB
 * version upgrades.
 * @param {string} idbDb name
 * @param {string} idbStore name
 * @param {Object} idbData {id: stationuuid}
 * @param {boolean} clearAll call clear() method
 * @returns {Promise} true
 * @example
 * await delPropIdb({
 *      idbDb: "app_db",
 *      idbStore: "downloader",
 *      idbData: {id: stationuuid},  // omit if clearAll
 *      clearAll: false, // can also omit this prop if idbData
 *    }).catch((e) => {
 *      console.error("deleteAsDownloder->set", e);
 *      resolve(false);
 *    });
 */
function delPropIdb(o = {}) {
  return new Promise(async (resolve, _) => {
    const idbDb = o.idbDb;
    const idbStore = o.idbStore;
    const idbData = o.idbData;
    const clearAll = o.clearAll;

    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: idbDb,
    }).catch((e) => {
      console.error("setPropIdb->get", e);
      resolve(false);
    });

    await delIdbValue({
      dbName: idbDb,
      dbVersion: version.dbVersion,
      objectStoreName: idbStore,
      data: idbData,
      clearAll: clearAll === true ? true : false,
    }).catch((e) => {
      console.error("delPropIdb->del", e);
      resolve(false);
    });
    resolve(true);
  });
}
