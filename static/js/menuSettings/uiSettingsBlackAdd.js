// uiSettingsBlackAdd.js
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

import { recMsg } from "../network/messages.js";
import { appendDiv, sleep } from "../uiHelper.js";
import { loadOneBlacklist } from "../fileStorage/blacklist.js";
import { getIdbValue, setIdbValue } from "../database/idbSetGetValues.js";
import {
  stationDbCreate,
  dbRegisterStreamer,
} from "../database/recorderState.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";
import { metaData } from "../central.js";

export { buildSettingsBlackAdd };

function buildSettingsBlackAdd() {
  createSettingsBlackAdd({ parentDiv: "blacklistAdd" }); // def in HTML
}

function createSettingsBlackAdd(o = {}) {
  return new Promise(async (resolve, _) => {
    const divOutlineChild = await createFeatureDivOutline({
      parentId: o.parentDiv,
      divOutline: "divBlackAddOutline",
    });
    divOutlineChild.style.display = "block";

    // remove X that hide the div
    divOutlineChild.removeChild(divOutlineChild.firstElementChild);
    // create new one
    const spanClose = document.createElement("span");
    spanClose.classList.add("handCursor");
    spanClose.innerText = "✖";
    spanClose.style.textAlign = "right";
    spanClose.style.paddingRight = "14px";
    spanClose.style.display = "inline-block";
    spanClose.style.width = "100%";
    spanClose.style.backgroundColor = "#fc4a1a";
    spanClose.addEventListener("click", () => {
      document.getElementById("blacklistAdd").style.display = "none";
    });
    divOutlineChild.appendChild(spanClose);

    await createFeatureDivSection({
      parentId: "divBlackAddOutline",
      childId: "divHeadlineBlackAdd",
    });
    createHeadlineBlackAdd({ parentId: "divHeadlineBlackAdd" });

    await createFeatureDivSection({
      parentId: "divBlackAddOutline",
      childId: "divBlacklistMerge",
    });
    mergeBlacklists({ parentId: "divBlacklistMerge" });
    resolve();
  });
}

function createHeadlineBlackAdd(o = {}) {
  const parentDiv = document.getElementById(o.parentId);
  const divHeadline = document.createElement("div");
  divHeadline.innerHTML =
    "Update/Restore blacklists and app settings from '.json' dump file.<br>";
  parentDiv.appendChild(divHeadline);
}

async function mergeBlacklists(o = {}) {
  const parentDiv = document.getElementById(o.parentId);
  const divFileUpload = document.createElement("div");

  const spanTxt = document.createElement("span");
  spanTxt.style.display = "block";
  spanTxt.innerText = "Watch status in log monitor.";
  divFileUpload.setAttribute("id", "divFileUpload");
  parentDiv.appendChild(divFileUpload);
  divFileUpload.appendChild(spanTxt);

  // Message hook
  const divMsg = document.createElement("div");
  divMsg.id = "addBlacklistJson";
  divFileUpload.appendChild(divMsg);
  // draw file selector
  const fileUpload = document.createElement("input");
  fileUpload.setAttribute("id", "fileUpload");
  fileUpload.setAttribute("type", "file");
  fileUpload.setAttribute("accept", "application/json");
  fileUpload.className = "upload";
  fileUpload.style.marginTop = "10px";
  fileUpload.style.marginBottom = "10px";
  divFileUpload.appendChild(fileUpload);
  // evt listener
  fileUpload.addEventListener("change", () => {
    while (divMsg.firstChild) divMsg.removeChild(divMsg.lastChild);
    const fr = new FileReader();
    fr.onload = function (e) {
      try {
        const result = JSON.parse(e.target.result);
        pushJsonToStores(result); // fileUpload.files[0] stored in the input element
      } catch (e) {
        divMsg.style.color = "#fc4a1a";
        appendDiv({
          parentId: "addBlacklistJson",
          childId: "blacklistAddFail",
          innerText: "fail ".concat(e.message),
          elemClass: "loggerFail",
        });
      }
    };
    fr.readAsText(fileUpload.files.item(0));
  });
}

function restoreSingleStore(o = {}) {
  return new Promise(async (resolve, _) => {
    const dbName = o.db;
    const store = o.store;
    const contentArray = o.contentArray;
    if (contentArray.length === 0) {
      recMsg(["nothing in ", store]);
    } else {
      recMsg(["restore ", store]);
    }

    const ver = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: dbName,
    });

    for (const keyVal of contentArray) {
      await setIdbValue({
        dbName: dbName,
        dbVersion: ver.dbVersion,
        objectStoreName: store,
        data: keyVal,
        // bulkInsert: true,
      }).catch((e) => {
        recMsg(["fail ::", store, e]);
      });
    }

    resolve();
  });
}

/**
 * Blindly restore.
 * Can be a situation where Favorites stationuuid is not in
 * the current (old) DB.
 * @param {*} blacklistDbs
 * @returns
 */
function restoreBlacklists(blacklistDbs) {
  return new Promise(async (resolve, _) => {
    if (blacklistDbs.length === 0) {
      recMsg(["nothing in blacklists"]);
    }
    // Create the DBs for the blacklists. DB may exist already.
    for (const db of blacklistDbs) {
      const stationuuid = db.dbId;
      const stationName = db.dbName; // for download, show readable name

      // Each DB has two stores; 'blacklist_names' and 'content_blobs'.
      recMsg(["restore blacklist ", stationName]);
      await stationDbCreate(stationuuid);
      await dbRegisterStreamer(stationuuid, stationName); // for blacklists mem loader
    }
    await sleep(1000);

    // Restore the blacklists. Add new and overwrite old entries.
    for (const db of blacklistDbs) {
      const blacklist = db.blacklist; // [{id: foo},{id:bar}] title array
      const stationuuid = db.dbId;
      const stationName = db.dbName;
      const store = db.store; // 'blacklist_names'

      const ver = await getIdbValue({
        dbName: "versions_db",
        dbVersion: 1,
        objectStoreName: "dbVersions",
        id: stationuuid,
      });
      // resolve bug?
      await setIdbValue({
        dbName: stationuuid,
        dbVersion: ver.dbVersion,
        objectStoreName: store,
        data: blacklist, // [{ id: title }],
        bulkInsert: true,
      });
      await loadOneBlacklist(stationuuid);
      recMsg(["load blacklist ", stationName]);
    }

    resolve();
  });
}

async function pushJsonToStores(jsonFile) {
  let blacklistDbs = null; // all DBs
  let appSettings = null; // one store
  let favorites = null; // one store
  let custom = null; // one store

  Object.entries(jsonFile).map(([key, val]) => {
    if (key === "blacklists") blacklistDbs = val;
    if (key === "appSettings") appSettings = val.flat(1); // [[],[]];
    if (key === "favorites") favorites = val.flat(1);
    if (key === "custom") custom = val.flat(1);
  });
  await restoreBlacklists(blacklistDbs);

  await restoreSingleStore({
    db: "app_db",
    store: "appSettings",
    contentArray: appSettings,
  });
  await restoreSingleStore({
    db: "radio_index_db",
    store: "Favorites",
    contentArray: favorites,
  });
  await restoreSingleStore({
    db: "radio_index_db",
    store: "Custom",
    contentArray: custom,
  });
  recMsg(["restore done; blacklists loaded and ready"]);
  recMsg(["Reload to apply Favorites and stored settings."]);
}
