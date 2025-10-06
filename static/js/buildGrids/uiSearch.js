// uiSearch.js
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
import { metaData } from "../central.js";

export { searchInputBar, clearSearchBar };

/**
 * Display only matching radios.
 * @param {*} o
 * @returns
 */
function searchInputBar(o = {}) {
  return new Promise((resolve, _) => {
    const markerUrl = 'url("./images/search-icon.svg")';
    const markerSize = "20px 20px";
    const markerPos = "4px 6px"; // left or "0px 0px"
    const inputSize = 13;
    const inputBottomMargin = "4px";
    const placeHolderSeachCountry =
      // "Search: radio name, reggae, хип-хоп, lounge, เพลงลูกทุ่ง, hls";
      "Search";

    const searchBar = document.getElementById("activityBar");
    // parent div and section wrapper
    const divWrapInputs = document.createElement("div");

    /* input */
    const input = document.createElement("input");
    input.id = "searchInput";
    input.type = "text";
    input.style.backgroundImage = markerUrl;
    input.style.backgroundSize = markerSize;
    input.style.backgroundPosition = markerPos;
    input.style.height = "32px";
    // input.style.width = "400px";
    input.style.paddingLeft = "28px";
    input.size = inputSize.toString();
    input.placeholder = placeHolderSeachCountry;
    input.style.borderLeft = "2mm ridge #49bbaa";
    input.style.borderTop = "1px solid #369082ff";
    input.style.borderRight = "1px solid #369082ff";
    input.style.borderBottom = "1px solid #369082ff";
    // input.style.border = "solid 1px " + nonRequiredCol;
    input.addEventListener("input", async (e) => {
      await searchTag(e);
    });
    const divInput = document.createElement("div");
    divInput.style.marginBottom = inputBottomMargin;
    const spanInputSearchHead = document.createElement("span");
    spanInputSearchHead.classList.add("spanHead");
    spanInputSearchHead.innerText = "";

    const spanInputSearchTail = document.createElement("span");
    spanInputSearchTail.classList.add("spanTail");

    searchBar.appendChild(divWrapInputs);
    divWrapInputs.appendChild(divInput);
    divInput.appendChild(spanInputSearchHead);
    divInput.appendChild(input);
    divInput.appendChild(spanInputSearchTail);
    // parent.insertBefore(searchBar, firstChild);

    resolve();
  });
}

function clearSearchBar() {
  return new Promise((resolve, _) => {
    const searchInput = document.getElementById("searchInput");
    searchInput.value = "";
    resolve();
  });
}

/**
 * Filter list of clicker divs by search string.
 * @param {event} e search input box onchange event
 */
function searchTag(e) {
  return new Promise(async (resolve, _) => {
    const sTag = e.target.value;
    if (sTag.length < 3) {
      return; // prevent search 50k for one character
    }

    const uuidArray = metaData.get().shownStationsIds;

    if (e.target.value.length >= 1) {
      await searchRun(sTag, uuidArray);
    }
    resolve();
  });
}

function searchRun(searchTag, uuidArray) {
  return new Promise(async (resolve, _) => {
    const switchedCount = await switchContainer(searchTag, uuidArray);
    recMsg([searchTag.concat(": ", switchedCount)]);
    resolve();
  });
}

/**
 * Show stations container where search is matching.
 * Search over station names and tags.
 *
 * World search takes long time (chinese extreme). refac
 * Need DB as key val in object store to attach two or
 * more search assistent worker.
 * https://medium.com/@kamresh485/a-comprehensive-guide-to-cursors-in-indexeddb-navigating-and-manipulating-data-with-ease-2793a2e01ba3
 * https://medium.com/@kamresh485/a-comprehensive-guide-to-indexeddb-indexes-enhancing-data-retrieval-in-web-applications-8755957c0cbe
 * https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/
 * @param {string} searchTag
 * @param {string} uuidArray stationuuid 's to get name and tag
 * @returns {number} count of shown stations
 */
function switchContainer(searchTag, uuidArray) {
  return new Promise((resolve, _) => {
    const suffix = "_container";

    // reduce, collect only hits in array
    const switchedCount = uuidArray.reduce((accu, uuid) => {
      const stationName = metaData.get().infoDb[uuid].name;
      let stationTag = metaData.get().infoDb[uuid].tags;

      if (stationTag === undefined) stationTag = "";

      // Can be a closed clicker div or an already unfolded grid.
      const clickerOrGrid = document.getElementById(uuid + suffix);
      if (
        stationTag.toLowerCase().includes(searchTag.toLowerCase()) ||
        stationName.toLowerCase().includes(searchTag.toLowerCase())
      ) {
        clickerOrGrid.style.display = "block";
        accu += 1;
      } else {
        clickerOrGrid.style.display = "none";
      }

      return accu;
    }, 0);
    resolve(switchedCount);
  });
}
