// publicDbCom.js
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

import { recMsg } from "./messages.js";
import { metaData } from "../central.js";
import { urlAlive } from "./streamDetect.js";
import { shuffleArray, sleep, getRandomIntInclusive } from "../uiHelper.js";
import { getIdbValue, setIdbValue } from "../database/idbSetGetValues.js";
import {
  fetchOpt,
  radioBrowserInfoDict, // same format as in response.json()
  nameSrvRadioBrowserInfo,
} from "../constants.js";

export {
  setSessionServer,
  getNameServer,
  submitStationVote,
  submitStationClicked,
  intervalGetOpenGridData,
  updateSingleStationJson,
};

/**
 * This is NOT related to normal station connects.
 * Transfer votes, clicks and new station datasets to the public database.
 * Clicker reads DB srv from mem.
 * Resolve a working public database server here.
 * Write URL or "NETWORK_ERROR" into closure.
 */

/**
 * Choose a random public DB server for this session.
 * Pulled from a dict. Remote or local.
 * The shuffled array is tested for live server until
 * one is found.
 * Set a DB server name to mem.
 * @returns {Promise} DB server name for alive test
 */
function setSessionServer() {
  return new Promise(async (resolve, _) => {
    let shuffledArray = [];
    metaData.set()["radioBrowserInfoUrl"] = "NETWORK_ERROR";

    const liveServers = await getDBsFromNameServer().catch((e) => {
      console.error("setSessionServer->", e);
      return false;
    });
    if (liveServers !== false) {
      // NS pull succsess.
      shuffledArray = await getServerArray(liveServers);
      // Store current dict of servers local as backup
      // in case NS are unavailable in next session.
      storeLiveDBserverIDB(liveServers);
    }
    if (liveServers === false) {
      // Read from local indexed DB (iDB).
      shuffledArray = await getLiveDBserverIDB();
      if (shuffledArray !== "FAIL_NO_DATA_IN_STORE") {
        // Read local iDB success.
        shuffledArray = await getServerArray(radioBrowserInfoDict);
      }
      if (shuffledArray === "FAIL_NO_DATA_IN_STORE") {
        // No NS at app first start.
        // Failed NS, use hardcoded DB server names from "constants.js".
        shuffledArray = await getServerArray(radioBrowserInfoDict);
        console.log("setSessionServer->", "use hardcoded DB server");
      }
    }

    const selectedSrv = await setDbSrvToMem(shuffledArray);
    resolve(selectedSrv);
  });
}

function getDBsFromNameServer() {
  return new Promise(async (resolve, _) => {
    const dbServerOj = await dlJson(nameSrvRadioBrowserInfo).catch((e) => {
      resolve(false);
      return;
    });
    if (dbServerOj === false) {
      resolve(false);
      return;
    } else {
      resolve(dbServerOj);
    }
  });
}

function dlJson(url) {
  return new Promise(async (resolve, _) => {
    const response = await fetch(url).catch((e) => {
      console.error("dlJson->", url, e);
      resolve(false);
      return false;
    });
    if (response) {
      const mrJson = response.json();
      resolve(mrJson);
    } else {
      resolve(false);
    }
  });
}

/**
 * Extra safety attempt. Write new server from NS to local store.
 * Will fail if Name Server is down or has outdated certificate.
 * @returns {Promise} done
 */
function getNameServer() {
  // used in this module and update DB
  return new Promise(async (resolve, _) => {
    // whole fun breaks if ns is not avail
    const isAlive = await urlAlive(nameSrvRadioBrowserInfo);
    console.log("getNameServer->", isAlive, nameSrvRadioBrowserInfo);
    const shuffledArray = await getServerArray(jsonObj);
    await setDbSrvToMem(shuffledArray);
    await setDbSrvToStore(jsonObj, shuffledArray);

    resolve();
  });
}

function getServerArray(jsonObj) {
  return new Promise(async (resovlve, _) => {
    const srvArray = [];
    // Push full URLs into array; JSON has name: and ip: properties.
    jsonObj.forEach((dict) => {
      if (!srvArray.includes(dict.name)) srvArray.push(dict.name);
    });
    resovlve(await shuffleArray(srvArray)); // refac - testable
  });
}

/**
 * Extra safety attempt.
 * Will fail if Name Server is down or has outdated certificate.
 * @returns {Promise} done
 */
function getDbSrvFromStore() {
  return new Promise(async (resolve, _) => {
    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });
    // new radio 'objects' db, load at app start
    const jsonDict = await getIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      id: "radio_browser_info_db_NS_JSON",
    }).catch(() => {
      const dct = {};
      dct["jsonObj"] = undefined;
      return dct;
    });
    resolve(jsonDict.jsonObj);
  });
}

/**
 * Just for getNameServer fun.
 * Extra safety attempt. Write new server from NS to local store.
 * Will fail if Name Server is down or has outdated certificate.
 * @returns {Promise} done
 */
function setDbSrvToStore(jsonObj, shuffledArray) {
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
        id: "radio_browser_info_db_server",
        dbServer: shuffledArray,
        updateTime: Date.now(),
      },
    });
    await setIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      data: {
        id: "radio_browser_info_db_NS_JSON",
        jsonObj: jsonObj,
        updateTime: Date.now(),
      },
    });
    resolve();
  });
}

/**
 * Reveal a working DB server from array.
 * @param {*} shuffledArray
 * @returns
 */
function setDbSrvToMem(shuffledArray) {
  return new Promise(async (resolve, _) => {
    const dbSrvHostname = await resolveLiveServer(shuffledArray);
    if (dbSrvHostname !== false)
      // write: de1.api.radio-browser.info
      metaData.set()["radioBrowserInfoUrl"] = dbSrvHostname;
    if (dbSrvHostname === false)
      metaData.set()["radioBrowserInfoUrl"] = "NETWORK_ERROR";

    // DB updater can loop through in case "dbSrvHostname" server is down.
    metaData.set()["radioBrowserServerArray"] = shuffledArray;
    resolve(dbSrvHostname);
  });
}

/**
 * Find a running server to pull the updates.
 * @param {Array} shuffledArray of host names
 * @returns {Promise} hostname
 */
function resolveLiveServer(shuffledArray) {
  return new Promise(async (resolve, _) => {
    let dbSrvHostname = false;
    const checkContenType = false;

    for (const hostname of shuffledArray) {
      const fragUrl = {
        protocol: "https://",
        host: hostname,
        endpoint: "/json/stations",
      };

      const url = fragUrl.protocol + fragUrl.host + fragUrl.endpoint;
      const isAvail = await urlAlive(url, checkContenType);
      if (isAvail) {
        dbSrvHostname = hostname;
        break;
      }
    }
    resolve(dbSrvHostname);
  });
}

/**
 * Called by submitStationClicked().
 * Increase the click count of a station by one.
 * Wait time for IP is 24h for each clicked station.
 * @param {string} stationuuid
 * @param {string} radioName
 */
async function postStationClick(stationuuid, radioName) {
  // POST, get JSON .../json/url/stationuuid
  // {"ok": "true","message": "retrieved station url",
  //   "stationuuid": "9617a958-0601-11e8-ae97-52543be04c81",
  //   "name": "Station name","url": "http://this.is.an.url"}
  return new Promise(async (resolve, _) => {
    if (stationuuid === undefined || stationuuid.includes("sr-custom-")) {
      resolve();
      return;
    }

    const dbSrvUrl = metaData.get()["radioBrowserInfoUrl"];
    const updateUrl = "https://" + dbSrvUrl + "/json/url/" + stationuuid;
    fetchOpt.method = "POST";
    const response = await fetch(updateUrl, fetchOpt).catch(() => {
      return false;
    });
    if (response === false) {
      // fetch failed.
      resolve();
      return;
    }
    let jsonSuccess = undefined;
    try {
      jsonSuccess = await response.json();
    } catch (e) {
      /** 
       * Korrupted network response.
       * SyntaxError: JSON.parse: unexpected end of data at line 1 column 1 of the JSON data 
       */
    }

    if (jsonSuccess === undefined || jsonSuccess.ok === false) {
      recMsg([
        "fail click count response ::",
        "radio-browser.info",
        radioName,
        stationuuid,
      ]);
      resolve(false);
    } else {
      recMsg([
        "Click response OK (valid 24h)",
        jsonSuccess.name,
        // jsonSuccess.stationuuid,
      ]);
      resolve(jsonSuccess.ok);
    }
  });
}

/**
 * Add one click for the station in the public database.
 * in rec in recordRadioStream.js, play in mediaElemListener.js
 * @param {string} stationName
 * @returns
 */
function submitStationClicked(stationuuid, stationName) {
  return new Promise(async (resolve, _) => {
    // Ask user setting if should send the station uuid.
    const sendStationId = await askSendStationId();
    if (sendStationId) {
      // write one click for the radio in the public db
      await postStationClick(stationuuid, stationName);
    }
    resolve();
  });
}

/**
 * Increase the vote count of a station by one.
 * Wait time for IP is 24h. Same station vote is NOT 10min as in info. refac
 * @param {string} stationuuid
 * @param {string} stationName
 */
async function postStationVote(stationuuid, stationName) {
  // POST, get JSON .../json/vote/stationuuid
  // {"ok": true,"message": "voted for station successfully"}
  return new Promise(async (resolve, _) => {
    const dbSrvUrl = metaData.get()["radioBrowserInfoUrl"];
    const updateUrl = "https://" + dbSrvUrl + "/json/vote/" + stationuuid;
    fetchOpt.method = "POST";
    const response = await fetch(updateUrl, fetchOpt).catch(() => {
      return false;
    });
    if (response === false) {
      recMsg(["Vote; radio-browser.info not responding.", stationName]);
      resolve();
      return;
    }
    const jsonSuccess = await response.json();

    if (jsonSuccess === undefined || jsonSuccess.ok === false) {
      recMsg(["fail :: wait 30 min. for same station vote.", stationName]);
      resolve(false);
    } else {
      recMsg(["Vote count response OK for ", stationName]);
      resolve(jsonSuccess.ok);
    }
  });
}

function submitStationVote(stationuuid, stationName) {
  return new Promise(async (resolve, _) => {
    // should write/read time stamp in/from store
    if (stationuuid !== undefined && stationuuid !== "") {
      // write one click for the radio in the public db
      await postStationVote(stationuuid, stationName);
    }
    resolve();
  });
}

async function intervalGetOpenGridData() {
  const sleepTime = 5000;
  const openGrids = metaData.get().buildStationIds; // array of stationuuid 's
  if (openGrids === undefined || openGrids.length === 0) return;

  for (const station of openGrids) {
    await updateSingleStationJson(station);
    await sleep(sleepTime);
  }
}

/**
 * Needs a ticket to fix POST list of uuid comma separated.
 * at radio-browser.info, git repo
 *
 * Request vote and click data from public DB.
 * @param {string} station stationuuid
 * @returns
 */
function updateSingleStationJson(stationuuid) {
  // http://de2.api.radio-browser.info/json/stations/byuuid/82e7a00e-54ec-45ea-8ae7-8a2b459084c2
  return new Promise(async (resolve, _) => {
    // refac - also if 'isRecording'
    if (stationuuid === undefined || stationuuid.includes("sr-custom-")) {
      resolve();
      return; // from async
    }
    // The votes badge is not shown but the title name.
    const isRecording = metaData.get().infoDb[stationuuid].isRecording;
    if (isRecording) {
      resolve();
      return;
    }

    const sendStationId = await askSendStationId();
    if (!sendStationId) return; // jumps out of async to outer resolve
    // Save ('too many requests'), if we don't run in a loop and a large grid list pops up.
    const sleepTime = getRandomIntInclusive(2, 6) * 100;
    const dbSrvUrl = metaData.get()["radioBrowserInfoUrl"];

    const updateUrl =
      "https://" + dbSrvUrl + "/json/stations/byuuid/" + stationuuid;

    await sleep(sleepTime);

    // Drop net errors.
    const response = await fetch(updateUrl, fetchOpt).catch(() => {
      return false;
    });
    if (response === false) return;

    // Drop JSON read errors.
    let json = undefined;
    try {
      json = await response.json();
    } catch (e) {
      return;
    }

    if (json === undefined || json[0] === undefined) {
      return;
    }
    // Try drop on malformed values. refac test on int
    let divVotesBadge = null;
    let divTitleBox = null;
    let jsonError = false;
    let votes = "";
    let clickcount = "";
    let clicktrend = "";
    try {
      // some 'test' store entries lack such an element
      divVotesBadge = document.getElementById("divVotesBadge_" + stationuuid);
      divTitleBox = document.getElementById("divVotesBadge_" + stationuuid);
      votes = json[0].votes;
      clickcount = json[0].clickcount;
      clicktrend = json[0].clicktrend;
    } catch (e) {
      jsonError = true;
      console.log("updateSingleStationJson->", stationuuid, e);
    }

    // Write to the badge
    if (divVotesBadge !== null && jsonError === false) {
      await updateVotesBadgeChange(
        stationuuid,
        divVotesBadge,
        votes,
        clickcount,
        clicktrend
      );
    }

    resolve();
  });
}

/**
 * Get local DB counts and compare it with public DB counts.
 * Update a badge so user can see if its vote, click was counted.
 * @param {*} stationuuid
 * @param {*} divVotesBadge
 * @param {*} votes
 * @param {*} clickcount
 * @param {*} clicktrend
 * @returns
 */
function updateVotesBadgeChange(
  stationuuid,
  divVotesBadge,
  votes,
  clickcount,
  clicktrend
) {
  return new Promise(async (resolve, _) => {
    // Write counts from public DB to badge.
    divVotesBadge.innerText = "votes ".concat(
      votes,
      " clicks ",
      clickcount,
      " trend ",
      clicktrend
    );
    // Ask indexed DB (new), if fail ask mem DB (loaded from file or last update, old)
    const voteObj = await getLocalVoteCounts(stationuuid).catch((e) => {
      console.error("getLocalVoteCounts->await", e);
    });
    const vangaVotes = voteObj.votes;
    const vangaClicks = voteObj.clickcount;
    const vangaTrend = voteObj.clicktrend;

    let gotChanged = false;
    if (
      vangaVotes !== undefined &&
      vangaVotes !== "" &&
      vangaClicks !== undefined &&
      vangaClicks !== "" &&
      vangaTrend !== undefined &&
      vangaTrend !== ""
    ) {
      // Update indexed DB, update mem DB.
      await setLocalVoteCounts(
        stationuuid,
        votes,
        clickcount,
        clicktrend
      ).catch((e) => {
        console.error("setLocalVoteCounts->await", e);
      });

      // Change color of badge regarded to the changed item.

      if (vangaClicks !== clickcount) {
        divVotesBadge.style.color = "blue";
        divVotesBadge.style.border = "2px solid blue";
        gotChanged = true;
      }
      if (vangaTrend !== clicktrend) {
        //
      }
      // override all
      if (vangaVotes !== votes) {
        divVotesBadge.style.color = "red";
        divVotesBadge.style.border = "2px solid red";
        gotChanged = true;
      }
      if (!gotChanged) {
        divVotesBadge.style.border = "1px solid black";
      }
      setTimeout(() => {
        divVotesBadge.style.color = "black";
        divVotesBadge.style.backgroundColor = "transparent";
        divVotesBadge.style.border = "0px solid black";
      }, 30000);
    }
    resolve();
  });
}

function getLocalVoteCounts(stationuuid) {
  return new Promise(async (resolve, _) => {
    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    }).catch((e) => {
      console.error("getLocalVoteCounts->get", e);
    });
    const storedVote = await getIdbValue({
      dbName: "radio_index_db",
      dbVersion: db.dbVersion,
      objectStoreName: "radio_browser_votes",
      id: stationuuid,
      // bulkInsert: true, // runs over the array of obj
    }).catch((e) => {
      return e; // error for if()
    });

    if (storedVote === "FAIL_NO_DATA_IN_STORE") {
      resolve({
        votes: metaData.get().infoDb[stationuuid].votes,
        clickcount: metaData.get().infoDb[stationuuid].clickcount,
        clicktrend: metaData.get().infoDb[stationuuid].clicktrend,
      });
    } else {
      resolve({
        votes: storedVote.votes,
        clickcount: storedVote.clickcount,
        clicktrend: storedVote.clicktrend,
      });
    }
  });
}

function setLocalVoteCounts(stationuuid, votes, clickcount, clicktrend) {
  return new Promise(async (resolve, _) => {
    metaData.set().infoDb[stationuuid].votes = votes;
    metaData.set().infoDb[stationuuid].clickcount = clickcount;
    metaData.set().infoDb[stationuuid].clicktrend = clicktrend;

    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    }).catch((e) => {
      console.error("setLocalVoteCounts->get", e);
    });

    await setIdbValue({
      dbName: "radio_index_db",
      dbVersion: db.dbVersion,
      objectStoreName: "radio_browser_votes",
      data: {
        id: stationuuid,
        name: metaData.get().infoDb[stationuuid].name,
        votes: votes,
        clickcount: clickcount,
        clicktrend: clicktrend,
      },
      // bulkInsert: true, // runs over the array of obj
    }).catch((e) => {
      console.error("setLocalVoteCounts->set", e);
      resolve(false);
    });

    resolve();
  });
}

/**
 * Ask user setting menu if we should send the station uuid.
 * @returns {Promise} boolean
 */
function askSendStationId() {
  return new Promise(async (resolve, _) => {
    const sendObj = await getIdbValue({
      dbName: "app_db",
      dbVersion: 1,
      objectStoreName: "appSettings",
      id: "sendStationId",
    }).catch((e) => {
      return e;
    });
    // The key, val is not written yet if user keeps the button untouched. refac write at init
    if (sendObj === "FAIL_NO_DATA_IN_STORE" || sendObj.isActive === true) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

/**
 * Store live server in indexed DB
 * @param {Object} serverDict
 * @returns {Promise} done
 */
function storeLiveDBserverIDB(serverDict) {
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
      data: { id: "radio_browser_live_server", liveServers: serverDict },
    }).catch((e) => {
      console.error("storeLiveDBserverIDB-> write db", e);
    });
    resolve();
  });
}

/**
 * Get live servers from indexed DB.
 * @returns {Promise} dict liverServers
 */
function getLiveDBserverIDB() {
  return new Promise(async (resolve, _) => {
    const version = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });
    // Try to load from store.
    const liveServers = await getIdbValue({
      dbName: "radio_index_db",
      dbVersion: version.dbVersion,
      objectStoreName: "db_downloads",
      id: "radio_browser_live_server",
    }).catch((e) => {
      // Custom error msg from getIdbValue FAIL_NO_DATA_IN_STORE.
      console.error("getLiveDBserverIDB->", e);
      return e; // "FAIL_NO_DATA_IN_STORE"
    });
    resolve(liveServers);
  });
}
