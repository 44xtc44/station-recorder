// idbCreateDefaults.js
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

import { default_radios } from "../assets/default_radios.js";
import { createIndexedDb } from "./idbInitDb.js";
import { getIdbValue, setIdbValue } from "./idbSetGetValues.js";

export {
  createAppDb,
  createVersionDb,
  createRadioIdxDb,
  createtStore,
  createDefaultRadios,
  testDataBase,
};

function createAppDb() {
  return new Promise((resolve, _) => {
    const objStores = [
      {
        storeName: "appSettings",
        primaryKey: "id",
        indexNames: ["appSettingsIdx", "id"],
      },
      {
        storeName: "favorites",
        primaryKey: "id",
        indexNames: ["favoritesIdx", "id"],
      },
      {
        storeName: "downloader",
        primaryKey: "id",
        indexNames: ["downloaderIdx", "id"],
      },
      {
        storeName: "uuid_name_dl",
        primaryKey: "id",
        indexNames: ["uuid_name_dlIdx", "id"],
      },
    ];
    createIndexedDb({
      dbName: "app_db",
      dbVersion: 1,
      batchCreate: true,
      objStores: objStores,
    })
      .then(() => resolve())
      .catch((e) => {
        console.error("createAppDb->", e);
      });
  });
}

function createVersionDb() {
  return new Promise((resolve, _) => {
    const objStores = [
      {
        storeName: "dbVersions",
        primaryKey: "id",
        indexNames: ["dbVersionsIdx", "id"],
      },
    ];
    createIndexedDb({
      dbName: "versions_db",
      dbVersion: 1,
      batchCreate: true,
      objStores: objStores,
    })
      .then(() => resolve())
      .catch((e) => {
        console.error("createVersionDb->", e);
      });
  });
}

function createRadioIdxDb() {
  return new Promise((resolve, _) => {
    const objStores = [
      {
        storeName: "Favorites",
        primaryKey: "id",
        indexNames: ["FavoritesIdx", "id"],
      },
      {
        storeName: "Custom", // user URLs not in public DB
        primaryKey: "id",
        indexNames: ["CustomIdx", "id"],
      },
      {
        // /assets/default_radios.js
        storeName: "tests",
        primaryKey: "id",
        indexNames: ["testsIdx", "id"],
      },
      {
        storeName: "db_downloads", // store updates as single object
        primaryKey: "id",
        indexNames: ["db_downloadsIdx", "id"],
      },
      {
        storeName: "radio_browser_db", // opt. webworker fill slowly; mem->store (single station)
        primaryKey: "id", // station gets {id: stationuuid} field
        indexNames: ["radio_browser_dbIdx", "id"],
      },
      {
        storeName: "radio_browser_votes", // synced votes, clicks from API after reload
        primaryKey: "id",
        indexNames: ["radio_browser_votesIdx", "id"],
      },
    ];
    createIndexedDb({
      dbName: "radio_index_db",
      dbVersion: 1,
      batchCreate: true,
      objStores: objStores,
    })
      .then(() => resolve())
      .catch((e) => {
        console.error("createIndexedDb->", e);
      });
  });
}

function createtStore(options = {}) {
  const dbName = options.db;
  const storeName = options.store;
  const primaryKey = options.primaryKey;
  let dbVersion = options.dbVersion;

  return new Promise((resolve, reject) => {
    createIndexedDb({
      dbName: dbName,
      dbVersion: dbVersion + 1,
      storeName: storeName,
      primaryKey: primaryKey,
      indexNames: [storeName.concat("Idx"), primaryKey],
    })
      .then(() => resolve())
      .catch((e) => {
        console.error("createtStore->", e);
      });
  });
}

/**
 * Put stations under a test button in Favorites.
 * Load from object in /assets folder.
 * @returns
 */
function createDefaultRadios() {
  return new Promise(async (resolve, _) => {
    const objArray = default_radios.map((dict) => {
      const obj = {
        id: dict.id,
        stationuuid: dict.stationuuid,
        description: dict.description,
        radio_url: dict.radio_url,
        site_url: dict.site_url,
        favicon: dict.favicon,
      };
      return obj;
    });

    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    }).then((db) => {
      setIdbValue({
        dbName: "radio_index_db",
        dbVersion: db.dbVersion,
        objectStoreName: "tests",
        data: objArray,
        bulkInsert: true,
      }).then(() => resolve());
    });
  });
}

function testDataBase() {
  // Open (or create) the database
  const open = indexedDB.open("app_db", 1);

  // Create the schema
  open.onupgradeneeded = function () {
    var db = open.result;
    var store = db.createObjectStore("dbVersions", { keyPath: "id" });
    var index = store.createIndex("dbVersionIdx", ["name.last", "name.first"]);
  };

  open.onsuccess = function () {
    console.log(",,,onsuccess,,,,,,,testDataBase->");
    // Start a new transaction
    var db = open.result;
    var tx = db.transaction("dbVersions", "readwrite");
    var store = tx.objectStore("dbVersions");
    // var index = store.index("dbVersionIdx");

    // Add some data
    store.put({ id: 12345, name: { first: "John", last: "Doe" }, age: 42 });
    store.put({ id: 67890, name: { first: "Bob", last: "Smith" }, age: 35 });

    // Query the data
    var getJohn = store.get(12345);
    // var getBob = index.get(["Smith", "Bob"]);

    getJohn.onsuccess = function () {
      console.log(getJohn.result.name.first); // => "John"
    };

    /*     getBob.onsuccess = function () {
      console.log(getBob.result.name.first); // => "Bob"
    }; */

    // Close the db when the transaction is done
    tx.oncomplete = function () {
      db.close();
    };
  };
}
