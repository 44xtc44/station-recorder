// dbLoader.js
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
import { splitStoreDictArray } from "../utils/objectToJsonFile.js";
import { getIdbValue, getIndex, delPropIdb } from "./idbSetGetValues.js";

let radioBrowserInfoDb = null;

/**
 * --- Debugger not avail. (FF) in this worker module --- use LOG
 */

self.onmessage = async () => {
  await countryCodesToMem();
  await loadJsonMasterFile();
  await customiseLocalStores();
  // await clearDownloaderStore(); // .clear() problem in worker!!!
  // Following dicts will be send stringyfied to the caller, loaded in mainthread.
  const infoDb = metaData.get().infoDb;
  const countryCodes = metaData.get().countryCodes;
  const countryNames = metaData.get().countryNames;

  self.postMessage({
    success: true,
    infoDb: infoDb,
    countryCodes: countryCodes,
    countryNames: countryNames,
  });
  metaData.set().infoDb = {};
  metaData.set().countryCodes = {};
  metaData.set().countryNames = {};
  self.close(); // self kill
};

self.onerror = (e) => {
  self.postMessage({
    success: false,
    workerError: JSON.stringify(e), // caller prints error
  });
  self.close();
};

// -------------------------------------  File loader  --------------------
/**
 * Read from local folder as extension.
 * https://stackoverflow.com/questions/36369082/relative-paths-with-fetch-in-javascript
 * ------------------------------------------------------
 * Path must be relative to 'index.html', not 'index.js'!
 * ------------------------------------------------------
 * @example
 * fetchJson("test.json");  // from Dl folder
 * fetchJson("/js/assets/radios_europe.json");  // static folder
 */
function fetchJson(relativePathToFile) {
  return new Promise(async (resolve, _) => {
    const response = await fetch(relativePathToFile).catch((e) => {
      console.error("fetchJson->", relativePathToFile, e);
      return false;
    });
    if (response) {
      const result = response.json();
      resolve(result);
    } else {
      resolve(false);
    }
  });
}

function fetchTextFile(relativePathToFile) {
  return new Promise(async (resolve, _) => {
    const response = await fetch(relativePathToFile).catch((e) => {
      console.error("fetchTextFile->", relativePathToFile, e);
      return false;
    });
    if (response) {
      const result = response.text();
      resolve(result);
    } else {
      resolve(false);
    }
  });
}

// ------------------------------------- -END - File loader  --------------------

// ------------------------------------ DB --------------------------------------
const metaHome = () => {
  // outer
  return {
    delete: function (data) {
      if (data in this.dataVault) delete this.dataVault[data];
      // inner
      return this.dataVault;
    },
    get: function (data) {
      if (!data) return this.dataVault;
      return this.dataVault;
    },
    set: function (data) {
      if (!this.dataVault) this.dataVault = {};
      if (this.dataVault[data] === undefined) this.dataVault[data] = {};
      return this.dataVault;
    },
  };
};

/**
 * Second function expression needed to access the stored val of the closure.
 */
const metaData = metaHome();

/**
 * Load country names and codes for UI to mem. at app start.
 * @example
 * // Request country 3-letter 'code' or full 'name'
 * metaData.get()["countryCodes"]["IQ"] // "IRQ"; {IQ:IRQ, IE:IRL}
 * metaData.get()["countryNames"]["ZM"] // "Zambia";  { ZA: "South Africa", ZM: "Zambia"}
 */
function countryCodesToMem() {
  return new Promise(async (resolve, _) => {
    const countryCodeCsv = await fetchTextFile(
      "../assets/wikipedia-iso-country-codes.csv"
    );
    const csvAarray = countryCodeCsv.toString().split("\n");
    csvAarray.shift(); // remove csv header

    // build two char key, three char value object
    const countryCodes2To3 = {};
    const countryCodes2ToName = {};
    const countryNamesTo2Char = {};
    csvAarray.map((line) => {
      const array = line.split(",");
      let countryName = array[0];
      if (countryName.slice(0, 1) === '"') {
        // remove double quotes
        countryName = countryName.slice(1, -1);
      }
      const twoCarCode = array[1];
      const threeCarCode = array[2];

      countryCodes2To3[twoCarCode] = threeCarCode;
      countryCodes2ToName[twoCarCode] = countryName;
    });
    metaData.set()["countryCodes"] = countryCodes2To3; // {IQ:IRQ, IE:IRL}
    metaData.set()["countryNames"] = countryCodes2ToName; //{ ZA: "South Africa", ZM: "Zambia"}

    resolve();
  });
}

/**
 * Json array object. [{},{},{}]
 * {
  "changeuuid": "bafbed7f-6b99-4ce1-b4be-75f336283c8d",
  "stationuuid": "7457e4b4-15ad-42d1-a333-0346929be8c6",
  "serveruuid": null,
  "name": "绿洲俱乐部Live House",
  "url": "https://stream.zeno.fm/by5n9vuubphvv",
  "url_resolved": "https://stream-176.zeno.fm/by5n9vuubphvv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJieTVuOXZ1dWJwaHZ2IiwiaG9zdCI6InN0cmVhbS0xNzYuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IjRkYi1GQlZGU0lpd3Q3WVV3alVnNGciLCJpYXQiOjE3Mjg3MjYxNDEsImV4cCI6MTcyODcyNjIwMX0.QVXLddJ1_cdu70LbIHyx0G7tVxOHKVwRvSFWv6-kH1A",
  "homepage": "https://zeno.fm/radio/lu-zhou-ju-le-bulive-house/",
  "favicon": "https://zeno.fm/favicon.ico",
  "tags: "ambient,relax,relaxing,sleep"
  "country": "China",
  "countrycode": "CN",
  "iso_3166_2": null,
  "state": "",
  "language": "chinese",
  "languagecodes": "",
  "votes": 27,
  "lastchangetime": "2024-07-26 11:49:26",
  "lastchangetime_iso8601": "2024-07-26T11:49:26Z",
  "codec": "MP3",
  "bitrate": 0,
  "hls": 0,
  "lastcheckok": 1,
  "lastchecktime": "2024-10-12 09:47:00",
  "lastchecktime_iso8601": "2024-10-12T09:47:00Z",
  "lastcheckoktime": "2024-10-12 09:47:00",
  "lastcheckoktime_iso8601": "2024-10-12T09:47:00Z",
  "lastlocalchecktime": "",
  "lastlocalchecktime_iso8601": null,
  "clicktimestamp": "",
  "clicktimestamp_iso8601": null,
  "clickcount": 0,
  "clicktrend": 0,
  "ssl_error": 0,
  "geo_lat": null,
  "geo_long": null,
  "has_extended_info": false
}
 */

/**
 * Load DB from file or from store if update was called.
 */
function infoDbToMem() {
  return new Promise(async (resolve, _) => {
    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });
    // Try to load from store.
    const stationDict = await getIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      id: "radio_browser_info_db", // next store key is time stamp of dl
    }).catch((e) => {
      // Custom error msg from getIdbValue FAIL_NO_DATA_IN_STORE.
      console.log("central, radioBrowserInfoDb not updated yet->", e);
    });

    // Load from Indexed DB store (update) or use file (outdated).
    if (stationDict !== undefined) {
      radioBrowserInfoDb = stationDict.add;

      // Redirect the output to file. For uploading to Mozilla Add-on.
      // ---------------- D U M P ------ dump ------------------------
      // await dumpDbToJsonFiles();
    } else {
      // JSON from remote API is [{}, {}, {}]
      radioBrowserInfoDb = [];
      const folder = "../assets/";
      const loader = "loaderFile.json";

      const dbFiles = await fetchJson(folder + loader);

      for (const stationsFile of dbFiles) {
        const stationArray = await fetchJson(folder + stationsFile);
        // Must unwrap array. JSONToFile() wraps all dumps with an extra [].
        const stationsFlat = stationArray.flat(1);
        for (const stationObj of stationsFlat) {
          radioBrowserInfoDb.push(stationObj);
        }
      }
    }
    resolve(radioBrowserInfoDb);
  });
}

/**
 * Add UI and recorder properties, load into dict 'infoDb'.
 * Store DB in mem. {uuid:{},uuid2:{},}
 * Key is stationuuid for super fast access.
 *
 * Set radioBrowserInfoDb = null; in called fun, after await
 *
 * @param {JSON} radioBrowserInfoDb array of objects
 * @returns
 * @example
 * const stationName = metaData.get()["infoDb"][stationuuid].name
 */
function customisePublicDb(radioBrowserInfoDb) {
  return new Promise(async (resolve, _) => {
    const availCountry = {}; // check new file if csv file needs update {foo:foo,bar:bar}

    let countStation = 0;
    let inMemDb = metaData.get().infoDb; // !!! Debugger !!!  whole raw DB
    if (inMemDb === undefined) {
      metaData.set()["infoDb"] = {};
    }

    // Update station obj. in mem DB with custom properies.
    for (const station of radioBrowserInfoDb) {
      await customTagOne(station);
      countStation += 1;
    }
    radioBrowserInfoDb = null;
    resolve();
  });
}

/**
 * Loading stations from radio-browser API (resulted dump file in /assets)
 * results in different key names than loading from gzip backup file.
 *
 * A station object has more attributes if called from API.
 * Some attributes have also different key names.
 * API call -> backup
 * ------------------
 * favicon -> url_favicon
 * homepage -> url_homepage
 * url -> url_stream
 *
 * {
 * "stationuuid": "96057c18-0601-11e8-ae97-52543be04c81",
 * "name": "Austrian Rock Radio",
 * "url_stream": "http://live.antenne.at/arr",
 * "url_homepage": "http://www.austrianrockradio.at/",
 * "url_favicon": "https://austrianrockradio.at/wp-content/uploads/2023/02/liferadio-150x150.png",
 * "tags": "rock",
 * "iso_3166_1": "AT",
 * "iso_3166_2": "",
 * "iso_639": null,
 * "geo_lat": null,
 * "geo_long": null
 * }
 * @param {Object{}} station
 * @returns {Promise<undefined>}
 */
function customTagOne(station) {
  return new Promise((resolve, _) => {
    // Prep to read from DB backup also.
    let secureUrl = ""; // was an idea to provide only secure URLs
    try {
      secureUrl = station.url.trim().substring(0, 5).toLowerCase();
    } catch (e) {
      // Patch the station object to proceed as usual, API call like.
      // Keep two options alive.

      station["url"] = station.url_stream;
      station["favicon"] = station.url_favicon;
      station["homepage"] = station.url_homepage;
      station["countrycode"] = station.iso_3166_1;

      secureUrl = station.url.trim().substring(0, 5).toLowerCase();
    }

    let protocol = "http";
    if (secureUrl === "https") protocol = "https";

    const plstExtThree = station.url.slice(
      station.url.length - 3,
      station.url.length
    );
    const plstExtFour = station.url.slice(
      station.url.length - 4,
      station.url.length
    );
    let isM3U = plstExtThree.includes("m3u") ? true : false;
    let isPLS = plstExtThree.includes("pls") ? true : false;
    let isM3u8 = plstExtFour.includes("m3u8") ? true : false;
    // part of URL in the middle
    let isM3u8plus = station.url.includes(".m3u8") ? true : false;
    if (isM3u8 || isM3u8plus) isM3u8 = true;

    let isAshx = station.url.includes("ashx") ? true : false; // full URL scan
    let isPlaylist =
      isM3U || isPLS || isM3u8 || isM3u8plus || isAshx ? true : false;

    let tags = station.tags;
    if (isM3u8) tags = tags.concat(",m3u8", ",HLS");
    if (isM3U) tags = tags.concat(",m3u");
    if (isPLS) tags = tags.concat(",pls");
    if (isAshx) tags = tags.concat(",ashx");

    const cc = station.countrycode.toUpperCase();
    const ccTo3char = metaData.get()["countryCodes"][cc];

    const customPropDb = {
      id: station.stationuuid, // Key to store obj in Favorites or Custom store.
      isPublic: true, // private station objects can not vote. Custom must set false.
      // filter group; country(2-char), continent(name), Custom('Custom'),Favorites('Favorites')
      stationGroup: "",
      isM3U: isM3U,
      isPLS: isPLS,
      isM3u8: isM3u8,
      isAshx: isAshx,
      isPlaylist: isPlaylist,
      tags: tags,
      protocol: protocol, // Future use or investigate DB.
      headers: null, // easy review
      ccTo3char: ccTo3char,
      isFavorite: false,
      isActive: false, // runner.js set to prevent multiple fetch of same station.
      isPlaying: false,
      isRecording: false,
      isListening: false,
      bitRate: "",
      chunkSize: "",
      textMsg: "", // recorder thread communication, obsolete if rec is web worker (DB)
      mediaBucket: null,
    };
    Object.assign(station, customPropDb); // bulk insert/update obj
    metaData.set()["infoDb"][station.stationuuid] = station;

    // availCountry[obj.countrycode] = obj.countrycode; // use debugger to watch

    resolve();
  });
}

function customiseLocalStores() {
  return new Promise(async (resolve, _) => {
    // Tag stations in Favorites store
    const favoritesArray = await getIndex({
      dbName: "radio_index_db",
      store: "Favorites",
    }).catch((e) => {
      console.error("loadJsonMasterFile->Favorites", e);
    });
    const favUuids = Object.values(favoritesArray).map(
      (station) => station.stationuuid
    );

    for (const favorite of favoritesArray) {
      await customTagOne(favorite);
      metaData.set().infoDb[favorite.stationuuid].isFavorite = true;

      const foo = metaData.get().infoDb[favorite.stationuuid];
      // if ((foo.name = "Nachtflug")) debugger;
    }

    // Tag stations in Custom store.
    const customArray = await getIndex({
      dbName: "radio_index_db",
      store: "Custom",
    }).catch((e) => {
      console.error("loadJsonMasterFile->Custom", e);
    });

    for (const station of customArray) {
      await customTagOne(station);
      // Don't show votes badge prop.
      metaData.set().infoDb[station.stationuuid].isPublic = false;
      // A custom station can be also in Favorites.
      if (favUuids.includes(station.stationuuid)) {
        metaData.set().infoDb[station.stationuuid].isFavorite = true;
      }
    }

    /*       
      // tests object store array ------------------ url and stationuuid!! -------------
      const testsArray = await getIndex({
        dbName: "radio_index_db",
        store: "tests",
      }).catch((e) => {
        console.error("loadJsonMasterFile->Custom", e);
      });

      await customisePublicDb(testsArray);
      for (const custObj of testsArray) {
        metaData.set().infoDb[custObj.stationuuid].isPublic = false; 
      }
 
 */

    resolve();
  });
}

function loadJsonMasterFile() {
  return new Promise(async (resolve, _) => {
    // Load raw JSON array.
    let radioBrowserInfoDb = await infoDbToMem();
    // Add custom properties to work with.
    await customisePublicDb(radioBrowserInfoDb);
    radioBrowserInfoDb = null;
    resolve();
  });
}

/**
 * Access to "World" filter btn is blocked if store is
 * occupied.
 */
function clearDownloaderStore() {
  return new Promise((resolve, _) => {
    delPropIdb({
      idbDb: "app_db",
      idbStore: "downloader",
      clearAll: true,
    }).catch((e) => {
      console.error("clearDownloaderStore->del", e);
      resolve(false);
    });
    console.log("deleete rec->");
    resolve(true);
  });
}

/**
 * DEV Manual. Update constants,js & wiki code csv in /assets to display 3-letter code.
 * @param {*} availCountry
 */
function getNewCountriesFromDb(availCountry, registCountry, count) {
  // full pull of mem
  const dump = metaData.get();
  const avail = Object.values(availCountry).filter(
    (countryCode) => !registCountry.includes(countryCode.toLowerCase())
  );
  console.log("count-->", count, avail, availCountry, dump);
}

/**
 * Take the radio-browser DB from memory and dump/chop
 * it into files below 4mb size.
 * Worker posts the findings as object.
 * The resolve is just there to allow async await.
 *
 * Worker caller adds a loader file, so the dbLoader can
 * easyly read on startup.
 * Caller reacts on "infoDbDumpDict" succsess key value.
 *
 * The Json dump fun puts an extra array on the choped pieces!!!
 * Unwrapper must use array.flat(1) to remove the outer [].
 * @returns {postMessage} dict { fileName1: [[{},{}]], fileName2: [[{},{}}]] }
 * @example
 * await dumpDbToJsonFiles();
 */
function dumpDbToJsonFiles() {
  return new Promise(async (resolve, _) => {
    // Redirect the output to file. For uploading to Mozilla Add-on.
    console.log("radioBrowserInfoDb-IDB->dump", radioBrowserInfoDb);
    const infoDbDumpDict = await splitStoreDictArray(
      radioBrowserInfoDb,
      2000, // max station objects; try to get below 4mb per file.
      "radioBrowserInfoDb"
    );
    // Return here.
    self.postMessage({
      success: "infoDbDumpDict",
      infoDbDumpDict: infoDbDumpDict,
    });
    resolve();
  });
}
