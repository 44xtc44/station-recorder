// uiDelRadio.js
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
import { sleep } from "../uiHelper.js";
import { metaData } from "../central.js";
import { getIdbValue, delIdbValue } from "../database/idbSetGetValues.js";
export { showDelMsg };

function createDelRadioUi(radio, parent) {
  metaData.set()["isDivDelRadio"] = false;
  const divDel = document.createElement("div");
  const spanClose = document.createElement("span");
  const spanBar = document.createElement("span");
  divDel.setAttribute("id", radio.id + "_divDelRadio");
  divDel.classList.add("settings");
  divDel.classList.add("wrapper");
  divDel.style.width = "375px";
  divDel.style.display = "none";
  divDel.style.zIndex = "3";
  divDel.style.left = "30px";
  divDel.style.backgroundColor = "#303030";
  divDel.style.marginTop = "5px";
  divDel.style.textAlign = "left";
  spanBar.style.verticalAlign = "middle";
  spanClose.classList.add("handCursor");
  spanClose.innerText = "✖";
  spanClose.style.float = "right";
  spanClose.style.display = "inline-block";
  parent.appendChild(divDel);

  divDel.appendChild(spanClose);
  divDel.appendChild(spanBar);
  spanClose.addEventListener("click", () => {
    divDel.style.display = "none";
  });
}

async function showDelMsg(stationuuid, parentDiv) {
  // remove a former shown element
  const stationObj = metaData.get().infoDb[stationuuid];

  try {
    document.getElementById(stationuuid + "delWrapper").remove();
  } catch (e) {}
  const wrapper = document.createElement("div");
  wrapper.setAttribute("id", stationuuid + "delWrapper");

  // head
  const header = document.createElement("div");
  header.innerText = "Delete Radio - " + stationObj.name;

  const description = document.createElement("div");
  description.innerHTML = "Delete the radio from this DB store?<br><br>";
  // del
  const divMsg = document.createElement("div");
  divMsg.setAttribute("id", stationuuid + "_delRadio");
  const delBtn = document.createElement("button");
  delBtn.classList.add("customButton_go");
  delBtn.innerText = "bye bye";
  delBtn.style.marginLeft = "15px";

  // DB items are appended
  wrapper.classList.add("wrapper");
  wrapper.style.width = "440px";
  wrapper.style.zIndex = "3";
  wrapper.style.left = "30px";
  wrapper.style.backgroundColor = "#303030";
  wrapper.style.marginTop = "5px";
  wrapper.style.textAlign = "left";

  parentDiv.appendChild(wrapper);
  wrapper.appendChild(header);
  wrapper.appendChild(description);
  wrapper.appendChild(delBtn);
  wrapper.appendChild(divMsg);

  delBtn.addEventListener("click", async () => {
    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "radio_index_db",
    });
    await delIdbValue({
      dbName: "radio_index_db",
      dbVersion: db.dbVersion,
      objectStoreName: stationObj.stationGroup,
      data: { id: stationuuid }, // [{ id: radioName }],
      // bulkInsert: true,
    }).catch((e) => console.error("delete station failed.", e));

    metaData.set().infoDb[stationuuid].isFavorite = false;
    recMsg(["removed from Favorites ", stationObj.name]);
    divMsg.innerText = "Wait for deletion from page.";
    divMsg.style.color = "rgba(170, 51, 106,1)";
    await sleep(1000);
    wrapper.remove();
    document.getElementById(stationuuid + "_container").remove();
  });
}
