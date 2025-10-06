// uiSettingsBlackDump.js
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

import { getIndex } from "../database/idbSetGetValues.js";
import { filledStationStoresGet } from "./uiFileDownload.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";

export { buildSettingsBlackDump };

function buildSettingsBlackDump(o = {}) {
  return new Promise((resolve, _) => {
    const wait = async () => {
      const parentDivId = "blacklistDump";
      const divOutlineChild = await createFeatureDivOutline({
        parentId: parentDivId,
        divOutline: "divBlackDumpOutline",
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
        document.getElementById("blacklistDump").style.display = "none";
      });
      divOutlineChild.appendChild(spanClose);

      await createFeatureDivSection({
        parentId: "divBlackDumpOutline",
        childId: "divBlackDump",
      });
      await createBlackDump({ parentId: "divBlackDump" });
    };
    wait();
  });
}

function createBlackDump(o = {}) {
  return new Promise((resolve, _) => {
    const parentId = o.parentId;
    const parentDiv = document.getElementById(parentId);
    const featureDiv = document.createElement("div");
    featureDiv.style.textAlign = "center";

    const spanTxt = document.createElement("span");
    spanTxt.dataset.shown = "false";
    spanTxt.innerText = "Dump";
    spanTxt.style.backgroundColor = "#5b5ab8";
    spanTxt.style.display = "inline-block"; // center works
    spanTxt.style.width = "75%";
    spanTxt.style.textAlign = "center";
    spanTxt.style.marginTop = "10px";
    spanTxt.style.marginLeft = "10px";

    parentDiv.appendChild(featureDiv);
    featureDiv.appendChild(spanTxt);

    // evt listener
    spanTxt.addEventListener("click", () => {
      const wait = async () => {
        const dumpDict = {}; // can store also settings here
        dumpDict["blacklists"] = [];
        dumpDict["custom"] = [];
        dumpDict["favorites"] = [];
        dumpDict["appSettings"] = [];

        // Only DBs with non empty stores.
        const filledDbArray = await filledStationStoresGet("blacklist_names");

        for (const db of filledDbArray) {
          const blacklistArray = await getIndex({
            dbName: db.id,
            store: "blacklist_names",
          });

          const blDump = {
            dbId: db.id,
            dbName: db.name,
            store: "blacklist_names",
            blacklist: blacklistArray,
          };
          dumpDict["blacklists"].push(blDump);
        }
        // Add also settings and favorites, so dump is more useful.
        const custom = await storeContentGet("radio_index_db", "Custom");
        dumpDict["custom"].push(custom);
        const favorites = await storeContentGet("radio_index_db", "Favorites");
        dumpDict["favorites"].push(favorites);
        const appSettings = await storeContentGet("app_db", "appSettings");
        dumpDict["appSettings"].push(appSettings);

        let date = new Date();
        const readableDate = date.toISOString().split("T")[0];
        date = null;
        const fileName = "blacklists_".concat(readableDate, ".json");
        await JSONToFile(dumpDict, fileName);
        spanTxt.innerText = "Dump file in download folder.";
      };
      wait();
    });

    resolve(); // fun
  });
}

/**
 *
 * @param {*} obj dict
 * @param {*} filename string
 * @example
 * JSONToFile({ test: 'is passed' }, 'testJsonFile');
 */
const JSONToFile = (obj, filename) => {
  return new Promise((resolve, _) => {
    // prettify level 2
    const blob = new Blob([JSON.stringify(obj, null, "\t")], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}`;
    a.click();
    URL.revokeObjectURL(url);
    resolve();
  });
};

function storeContentGet(dbName, objectStore) {
  return new Promise((resolve, _) => {
    const wait = async () => {
      const dictArray = await getIndex({
        dbName: dbName,
        store: objectStore,
      }).catch((e) => {
        console.error("storeContentGet->", e);
      });
      resolve(dictArray);
    };
    wait();
  });
}
