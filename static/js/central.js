// central.js
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
import { JSONToFile } from "./utils/objectToJsonFile.js";
export { metaData, runDbLoader };

let dbLoader = new Worker(
  new URL("/static/js/database/dbLoader.js", import.meta.url),
  { type: "module" }
);

/**
 * Call the space station (dbLoader worker process).
 * Communication is only possible via messages.
 * index.js triggers the fun if indexed DB stores are ready
 * to be filled.
 *
 * Space station sends the database and gets terminated.
 *
 * It is also possible now to fill the object store with this huge
 * amount of key val pairs slowly (stationuuid as 'id' key).
 * This would have blocked the main thread for a minute otherwise.
 */
function runDbLoader() {
  return new Promise((resolve, _) => {
    const errMsgCaller = "fail:: Caller DB. Try again or reinstall app.";
    const errMsgWorker = "fail:: Worker load DB. Try again or reinstall app.";

    dbLoader.postMessage("Build an indexed DB.");

    dbLoader.onerror = (e) => {
      console.error(errMsgCaller, e);
      dbLoader = null;
      resolve();
    };

    // Receive different messages from worker. OK, NOK, DB Dump
    dbLoader.onmessage = async (e) => {
      if (e.data.success === false) {
        console.error(errMsgWorker, e.data.workerError);
        return;
      }
      if (e.data.success === true) {
        //{ data :{ infoDb: {…}, countryCodes: {…}, countryNames: {…} } }
        metaData.set()["infoDb"] = e.data.infoDb; // customised stations obj array
        metaData.set()["countryCodes"] = e.data.countryCodes; // {IQ:IRQ, IE:IRL}
        metaData.set()["countryNames"] = e.data.countryNames; //{ ZA: "South Africa", ZM: "Zambia"}
        e.data.infoDb = {};
        e.data.countryCodes = {};
        e.data.countryNames = {};
        // .close() in worker to destroy process; .terminate() not reliable, Python like
        dbLoader = null;
      }
      if (e.data.success === "infoDbDumpDict") {
        let fileIds = [];
        for (const dict of e.data.infoDbDumpDict) {
          const fileName = Object.keys(dict)[0]; // array of one elem
          const stationArray = Object.values(dict);
          fileIds.push(fileName); // Will be read by DB loader.
          await JSONToFile(stationArray, fileName);
        }
        const loaderFile = "__loaderFile.json";
        await JSONToFile(fileIds, loaderFile);
      }
      resolve();
    };
  });
}

/**
 * Memory storage, cache. 'metadata' variable exports the closure.
 *
 * Function expression closure with setter and getter.
 * Fun hoisted, but not as an expression, fun in 'var'. (interview quest)
 * Set, get key values may not be arrow functions, because of 'this'.
 *
 * Save/add the result of a DB request promise
 * via callback into a closure.
 * @param set a dict value(s)
 * @param get stored object from this closure
 * @param delete object from this closure
 * @returns {Object} dictionary s
 * @example
 * metaData.set()["countryCodes"] = countryCodes2To3; // {IQ:IRQ, IE:IRL}
 */
// else have interesting refs to before reload objects
// DEU ebm-radio pls choose a URL, stays after reload
let metaHome = null;
metaHome = () => {
  // outer
  return {
    delete: function (data) {
      if (data in this.dataVault) delete this.dataVault[data];
      // inner
      return this.dataVault;
    },
    get: function (data) {
      if (data === undefined) return this.dataVault;
      return this.dataVault[data];
    },
    set: function (data) {
      if (!this.dataVault) this.dataVault = {};
      if (this.dataVault[data] === undefined) this.dataVault[data] = {};
      return this.dataVault;
    },
  };
};

/**
 * Second function expression needed to access the stored val in the closure.
 */
let metaData = null;
metaData = metaHome();
