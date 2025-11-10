// logHistory.js
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

import { metaData } from "../central.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";

export { buildLogHistory };

const parser = new DOMParser(); // sanitize html, else mozilla linter cries

function buildLogHistory() {
  createLogHistory({ parentDiv: "logHistory" }); // def in HTML
}

function createLogHistory(o = {}) {
  return new Promise(async (resolve, _) => {
    const divOutlineChild = await createFeatureDivOutline({
      parentId: o.parentDiv,
      divOutline: "divLogOutline",
    });
    divOutlineChild.style.display = "block";

    // remove X that hide the div
    divOutlineChild.removeChild(divOutlineChild.firstElementChild);
    // create new one
    document.getElementById("fixedPositionAnchor").style.height = "100%";
    const spanClose = document.createElement("span");
    spanClose.classList.add("handCursor");
    spanClose.innerText = "✖";
    spanClose.style.textAlign = "right";
    spanClose.style.paddingRight = "14px";
    spanClose.style.display = "inline-block";
    spanClose.style.width = "100%";
    spanClose.style.backgroundColor = "#fc4a1a";
    spanClose.addEventListener("click", () => {
      document.getElementById("logHistory").style.display = "none";
    });
    divOutlineChild.appendChild(spanClose);

    await createFeatureDivSection({
      parentId: "divLogOutline",
      childId: "divLogMessages",
    });
    addLogMessages({ parentId: "divLogMessages" });
    resolve();
  });
}

function addLogMessages(o = {}) {
  const parent = document.getElementById(o.parentId);
  // remove old log, if called second time
  try {
    document.getElementById("divLogHistLines").remove();
  } catch (e) {}
  const divLogHistLines = document.createElement("div");
  divLogHistLines.id = "divLogHistLines";

  const spanClicker = document.createElement("span");
  const divLogWrap = document.createElement("div");

  parent.appendChild(divLogHistLines);
  divLogHistLines.appendChild(spanClicker);
  divLogHistLines.appendChild(divLogWrap);

  divLogHistLines.style.textAlign = "left";
  divLogHistLines.style.verticalAlign = "middle";
  spanClicker.innerText = "click on log to refresh";
  spanClicker.style.paddingLeft = "10px";
  spanClicker.style.paddingRight = "10px";
  spanClicker.style.borderRadius = "5px";
  spanClicker.style.backgroundColor = "#5b5ab8";
  spanClicker.classList.add("handCursor");
  spanClicker.addEventListener("click", () => {
    while (divLogWrap.firstChild) divLogWrap.removeChild(divLogWrap.lastChild);
    displayLogHistory(divLogWrap);
  });
}

function displayLogHistory(divLogWrap) {
  const logArray = metaData.get()["fullLogHistory"];
  logArray.map((txtLine) => {
    const logLine = document.createElement("div");
    logLine.style.position = "relative"; // get the images in place
    const htmlParsed = parser.parseFromString(txtLine, "text/html");
    const tags = htmlParsed.getElementsByTagName("body");
    for (const tag of tags) {
      logLine.appendChild(tag);
    }

    logLine.style.boxShadow = "inset 0 0 4px #513045";
    divLogWrap.appendChild(logLine);

    logLine.addEventListener("click", () => {
      while (divLogWrap.firstChild)
        divLogWrap.removeChild(divLogWrap.lastChild);
      displayLogHistory(divLogWrap);
    });
  });
}
