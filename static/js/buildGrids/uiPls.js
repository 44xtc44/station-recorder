// uiPls.js
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
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "./uiSubmenu.js";

export { showPls };

/**
 * Offer possibility to replace station URL with URL from playlist.
 * stationuuid is arg to force to recall fresh info from station object.
 * Else it'S fields could become outdated by passing it through the functions.
 * @param {String[]} text playlist URLs, .pls has File1=http... string
 * @param {string} stationuuid
 */
async function showPls(text, stationuuid) {
  const parentId = "fixedPositionAnchor";
  const stationObj = metaData.get().infoDb[stationuuid];
  const stationName = stationObj.name;
  const plsType = stationObj.isM3U ? ".m3u" : ".pls";

  const plsOuter = await createPlsUiOuter({
    parentId: parentId,
    childId: "plsOuter",
  });

  // remove X that hide the div
  plsOuter.removeChild(plsOuter.firstElementChild);
  document.getElementById("fixedPositionAnchor").style.height = "100%";
  // X must remove div
  const spanClose = document.createElement("span");
  spanClose.classList.add("handCursor");
  spanClose.innerText = "✖";
  spanClose.style.textAlign = "right";
  spanClose.style.paddingRight = "14px";
  spanClose.style.display = "inline-block";
  spanClose.style.width = "100%";
  spanClose.style.backgroundColor = "#fc4a1a";
  spanClose.addEventListener("click", () => {
    plsOuter.remove();
  });
  plsOuter.appendChild(spanClose);

  const head = await createFeatureDivSection({
    parentId: "plsOuter",
    childId: "headPlsTxt",
  });

  const hint = await createFeatureDivSection({
    parentId: "plsOuter",
    childId: "hintPls",
  });
  hint.innerHTML =
    "Click a stream URL to replace the playlist URL with your choice (default is first URL, do nothing).<br>" +
    "Please reload app to select other stream URLs, if any.<br>" +
    "Or use button 'URL add' to store the custom URL permanent.";

  await createPlsUiHead({
    parentDiv: head,
    stationName: stationName,
    outerDivId: "plsOuter",
    plsType: plsType,
  });

  const infoBlock = await createFeatureDivSection({
    parentId: "plsOuter",
    childId: "InfoBlockPls",
  });
  infoBlock.style.overflow = "auto";

  await createPlsInfoBlock({
    parentDiv: infoBlock, // full path "InfoBlockPls"
    text: text,
    stationuuid: stationuuid,
    plsType: plsType,
  });
}

/**
 * Can replace station URL with URL from playlist.
 * @param {*} o
 * @returns
 */
function createPlsInfoBlock(o = {}) {
  return new Promise(async (resolve, _) => {
    const textPlaylist = o.text;
    const stationuuid = o.stationuuid;
    const parentDiv = o.parentDiv;
    const plsType = o.plsType;

    if (textPlaylist === false) return; // wrong configured radio server

    for (const urlString of textPlaylist) {
      if (urlString.includes("http")) {
        let url = urlString;
        // pls must split - File=http....
        if (plsType === ".pls") {
          url = urlString.split("=")[1];
        }

        const div = document.createElement("div");
        const spanUrl = document.createElement("span");
        spanUrl.style.verticalAlign = "8px";
        const link = "<a " + url + ">" + url + "</a>";
        spanUrl.innerText = url;
        div.appendChild(spanUrl);
        const imgCopy = document.createElement("img");
        imgCopy.classList.add("handCursor");
        imgCopy.src = "./images/copy-icon.svg";
        imgCopy.style.height = "30px";
        imgCopy.style.marginTop = "-4px";
        div.appendChild(imgCopy);
        parentDiv.appendChild(div);

        imgCopy.addEventListener("click", async () => {
          navigator.clipboard.writeText(url);
          imgCopy.src = "./images/copy-done-icon.svg";

          await sleep(1000);
          imgCopy.src = "./images/copy-icon.svg";
        });

        spanUrl.addEventListener("click", async () => {
          metaData.set().infoDb[stationuuid].url = url;
          // streamdetect should not resolve pls again
          metaData.set().infoDb[stationuuid].isPlaylist = false;
          recMsg(["replace playlist URL with " + url]);

          await sleep(100);
          document.getElementById("plsOuter").remove();
          resolve();
        });
      }
    }
    resolve();
  });
}

function createPlsUiHead(o = {}) {
  return new Promise(async (resolve, _) => {
    const stationName = o.stationName;
    const parentDiv = o.parentDiv;
    const outerDiv = document.getElementById(o.outerDivId);
    const spanName = document.createElement("span");
    const spanTxt = document.createElement("span");
    parentDiv.appendChild(spanName);
    parentDiv.appendChild(spanTxt);
    spanName.innerText = stationName;
    spanName.style.color = "tomato";
    spanTxt.innerText = o.plsType;
    parentDiv.addEventListener("click", () => {
      outerDiv.style.display = "none";
    });
    resolve();
  });
}

function createPlsUiOuter(o = {}) {
  return new Promise(async (resolve, _) => {
    try {
      document.getElementById(o.childId).remove();
    } catch (e) {}
    const divOutline = await createFeatureDivOutline({
      parentId: o.parentId,
      divOutline: o.childId,
    });
    divOutline.classList.add("column500");
    divOutline.style.width = "500px";
    divOutline.style.display = "block";
    resolve(divOutline);
  });
}
