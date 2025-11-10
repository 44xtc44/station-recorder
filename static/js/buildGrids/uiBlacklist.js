// uiBlacklist.js
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
import { loadOneBlacklist } from "../fileStorage/blacklist.js";
import {
  getIndex,
  getIdbValue,
  delPropIdb,
} from "../database/idbSetGetValues.js";
import { sleep } from "../uiHelper.js";

export { showBlacklist };

/**
 * REFAC uiBlacklist.js module. 'filter.length' same run again, split funs.
 * build page, collect, filter, delete
 */

async function showBlacklist(o = {}) {
  const masterDiv = o.masterDiv;
  const parentDiv = o.parentDiv;
  const stationName = o.stationName;
  const dbId = o.dbId;

  const delSection = document.createElement("div");
  delSection.id = stationName + "delSection";
  delSection.style.marginBottom = "10px";

  // head
  const header = document.createElement("div");
  header.innerText = "Blacklist - " + stationName;
  const description = document.createElement("div");
  description.innerHTML =
    "Delete or purge the list to allow disk write again.<br>" +
    "--- No app reload required ---<br><br>";

  // delete Button "bye bye"
  const delBtn = document.createElement("button");
  delBtn.classList.add("customButton_go");
  delBtn.innerText = "Delete";
  delBtn.style.marginLeft = "15px";
  // input checkbox to select all checkboxes
  const masterBox = document.createElement("input");
  masterBox.setAttribute("type", "checkbox");
  masterBox.setAttribute("id", "blDelete");
  masterBox.setAttribute("name", "blDelete");
  masterBox.dataset.checked = "false";
  // label for Button "bye bye"
  const label = document.createElement("label");
  label.setAttribute("for", "blDelete");
  label.innerText = "Delete Blacklist.";

  parentDiv.appendChild(delSection);
  delSection.appendChild(header);
  delSection.appendChild(description);
  delSection.appendChild(masterBox);
  delSection.appendChild(label);
  delSection.appendChild(delBtn);

  // Master checkbox.
  masterBox.addEventListener("click", () => {
    const allCheckBoxes = document.getElementsByClassName("blackCheck");
    if (masterBox.dataset.checked === "false") {
      masterBox.dataset.checked = "true";
      masterBox.checked = true;
      for (const checkBox of allCheckBoxes) {
        const box = document.getElementById(checkBox.id);
        box.checked = true; // checkbox foo.checked is boob
      }
    } else {
      masterBox.dataset.checked = "false"; // dataset is string
      masterBox.checked = false;
      for (const b of allCheckBoxes) {
        const box = document.getElementById(b.id);
        box.checked = false; // bool not string
      }
    }
  });

  // Try pull blacklist.
  let blacklist = undefined;
  if (dbId !== undefined) {
    blacklist = await getIndex({
      dbName: dbId,
      store: "blacklist_names",
    }).catch((e) => {
      return e;
    });
  }

  const blacklistFail = document.createElement("div");
  const failMsg = "Nothing in here.";
  blacklistFail.innerText = failMsg;
  if (blacklist === "FAIL_TRANSACT_NOSTORE" || blacklist === undefined) {
    blacklist = [];
    parentDiv.appendChild(blacklistFail);
  }

  if (blacklist.length > 0)
    blacklist.map((blackName) => {
      const div = document.createElement("div");
      const box = document.createElement("input");
      box.setAttribute("type", "checkbox");
      box.setAttribute("id", blackName.id);
      box.setAttribute("name", blackName.id);
      box.classList.add("blackCheck");
      const label = document.createElement("label");
      label.setAttribute("id", "lblCheckbox_" + blackName.id);
      label.setAttribute("for", blackName.id);
      label.innerText = blackName.id;
      div.setAttribute("id", "divBl_" + blackName.id);
      div.classList.add("blacklist");
      parentDiv.appendChild(div);
      div.appendChild(box);
      div.appendChild(label);
    });

  // Evt delete button collects checkbox checked.
  delBtn.addEventListener("click", async () => {
    const allCheckBoxes = document.getElementsByClassName("blackCheck");

    const candidates = Object.values(allCheckBoxes).map((checkBox) => {
      return checkBox.id;
    });
    const filter = candidates.filter(
      (checkBox) => document.getElementById(checkBox).checked
    );

    if (filter.length > 0) {
      for (const checkBox of filter) {
        const box = document.getElementById(checkBox);
        box.disabled = "true";
        box.classList.remove("blackCheck");
      }
      for (const checkBox of allCheckBoxes) {
        const box = document.getElementById(checkBox.id);
        box.disabled = "true";
      }
      masterBox.disabled = "true"; // input checkbox to select all checkboxes
    }

    if (filter.length > 0) {
      // 'id' is keypath
      const titleArray = filter.map((title) => {
        return { id: title };
      });

      const db = await getIdbValue({
        dbName: "versions_db",
        dbVersion: 1,
        objectStoreName: "dbVersions",
        id: dbId,
      });

      const delDict = {
        dbName: dbId,
        dbVersion: db.dbVersion,
        objectStoreName: "blacklist_names",
        data: titleArray, // single del; data: {id: "Adverb - Periferico  amorisskntru"},
        bulkInsert: true,
      };

      for (const title of titleArray) {
        await delPropIdb({
          idbDb: dbId,
          idbStore: "blacklist_names",
          idbData: title, // {id: foo - bar}
          clearAll: false, // can also omit this prop if idbData
        }).catch((e) => {
          console.error("delPropIdb->blacklist", e);
          resolve(false);
        });
      }

      await sleep(1000);
      loadOneBlacklist(dbId); // load this single blacklist from store into mem
      recMsg(["blacklist reloaded ", stationName]);
      masterDiv.remove();
    }
  });
}
