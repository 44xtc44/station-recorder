// dbLoaderBoss.mjs
"use strict";
const debug = false;
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
import { featSettingStatus } from "../menuSettings/uiSettings.js";
import { findDuplicateUrl } from "./findDuplicateUrls.js";
export { DBLoader };

/**
 * A Browser extension with webWorker runs stable and tests with Playwrigt.
 * Short 4 rules:
 *   File extension of JS modules is .mjs
 *   A boss module with class methods (async) to spawn/kill a worker
 *   A worker module sends events (errors) as JSON
 *   URL style for path to worker module
 *     const foo = new Worker(new URL("pathToWorker", import.meta.url),
 *       {type: "module",}))
 *
 * What is loaded:
 * Load TV/Radio station DB, a JSON object. Loaded from DB backup files.
 *   May crash your DEBUGGER->60MB !!!
 * Offered by a "closure" fun as central data core.
 * Dump/debug the data of the app at a given time.
 *  A station objects dict, modified by worker (add keys)
 *  B country codes translators dict for UI
 *  C country names translators for dict UI
 *  D "method"s may write to "closure" for communication
 *
 * Annex:
 * Later I want multiple calls to a specific webWorker process, core.
 * Split workload, chunks, use multiple cores and assamble findings.
 * Load a huge JSON DB backup in splitted files. Like this app.
 * One loader generator. 100 chunks, two webWorker.
 * Next chunk if process is ready again.
 * May need upstream/downstream queues. WebWorker input/output.
 * Or output hard wired fun on msg.id? Adapt module design.
 * @example
 * const db = new DBLoader();
 * await db.spawnWorker({ msg: "Load DB", action: "load_DB" });
 * const db2 = new DBLoader();
 * await db2.spawnWorker({ msg: "Backup DB", action: "backup_DB" });
 * console.log(
 *   "Compare-> DBLoader class, webWorker ",
 *   db === db2,
 *   db.worker === db2.worker
 * ); // result: Compare-> DBLoader class, webWorker true, true
 */
class DBLoader {
  constructor() {
    if (DBLoader.instance) return DBLoader.instance;
    DBLoader.instance = this;
    this.worker = null;
    this.workerPath = "dbLoader.mjs";
  }
  static getInstance() {
    if (!DBLoader.instance) DBLoader.instance = new DBLoader();
    return DBLoader.instance;
  }
  /**
   * Later cleanup of double URLs depends on loaded JSON object.
   * Which is e.data.infoDb (60MB).
   * ---> worker should also fire findDuplicateUrl() <--- UI settings option
   * @returns {Promise<undefined>} .onmessage triggered
   */
  spawnWorker({ msg, action }) {
    return new Promise((resolve, _) => {
      if (this.worker === null) {
        this.worker = new Worker(new URL(this.workerPath, import.meta.url), {
          type: "module",
        });
      }

      this.worker.postMessage({ msg: msg, action: action });
      this.worker.onerror = (e) => {
        if (debug) console.error("-> DB worker reported error.", e);
        this.killWorker();
      };

      this.worker.onmessage = async (e) => {
        if (e.data.success === true) {
          //{ data :{ infoDb: {…}, countryCodes: {…}, countryNames: {…} } }
          metaData.set()["infoDb"] = e.data.infoDb; // customised stations obj array
          metaData.set()["countryCodes"] = e.data.countryCodes; // {IQ:IRQ, IE:IRL}
          metaData.set()["countryNames"] = e.data.countryNames; //{ ZA: "South Africa", ZM: "Zambia"}
          e.data.infoDb = {};
          e.data.countryCodes = {};
          e.data.countryNames = {};
          // .close() in worker to destroy process; .terminate() not reliable, Python like
          this.worker = null;

          const urlFilter = await featSettingStatus(
            "app_db",
            "appSettings",
            "filterDoubleUrl",
            true
          );
          if (urlFilter) await findDuplicateUrl();
          resolve();
        }
        // Dump modified DB to file.
        // Needs implementation boss .postMessage and worker .onmessage text or id.
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
          resolve();
        }
      };
    });
  }
  killWorker() {
    this.worker.terminate();
    this.worker = null;
  }
}
