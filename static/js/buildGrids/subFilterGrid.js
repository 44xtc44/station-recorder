// subFilterGrid.js
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

import { areaCountries } from "../constants.js";
import { sleep } from "../uiHelper.js";
import { recMsg } from "../network/messages.js";
import { metaData } from "../central.js";
import { getIndex } from "../database/idbSetGetValues.js";
import { stationClickerLinks } from "./stationContainer.js";
import {
  accessBlock,
  accessAllow,
  threadOverloadContainer,
} from "../network/messages.js";

export {
  countriesBtns,
  continentBtns,
  localDbBtns,
  worldAreasBtns,
  showFavoriteStores,
};

/**
 * Do not use extra DRY here. Filter vary much.
 * TopFilter-SubFilter->stations, World-Asia->stations
 * TopFilter-SubFilter-SubSubFilter->stations, Continents-Europe-Uk->stations
 *
 * (Proposal) May also introduce more filter with a top level search bar.
 * Search bar static on top. Keep search string, choose topFilter button.
 *
 * Need different listeners on topFilterBar's sub-filter.
 * Branches a button can belong to, in the top level grid:
 * (A) Favorites, localDbBtns() - opens local indexed DB Favorites and Custom buttons
 * (B) World, continentBtns() - opens a grid of buttons sorted as 3-letter country buttons
 * (C) Continent, worldAreasBtns() - opens a grid of area buttons (Asia, Africa, ...)
 *
 * Users custom stations ("Custom" iDB store btn) stations are appended
 * (and customised) to the in mem 'metadata' infoDb, public database dict.
 *
 * Stations will be stacked as childs of an anchor div.
 * Anchor div removal is faster than looping through the whole stack.
 */

// ------------------------------------------------------------------------------ Favorites iDB ----
/**
 * Create anchor div and set listeners on child div buttons.
 *
 * "Favorites" top Btn; Local stores "Favorites" & "Custom" in indexed DB.
 * @param {string[]} storeNames "Favorites" & "Custom" station iDB store names
 * @param {HTMLObjectElement} favoritesBtn "Favorites" button div
 * @param {string} favoritsName name value "Favorites" button
 */
function localDbBtns(storeNames, favoritesBtn, favoritsName) {
  return new Promise((resolve, _) => {
    favoritesBtn.addEventListener("click", async () => {
      await removeElement("stationsAnchor"); // prep drawing new stations container

      const anchor = await subFilterContainer();
      anchor.classList.add("grid_sub_favorites"); // grid layout, col, rows
      recMsg(["area " + favoritsName]);

      let namesArray = [...storeNames];
      namesArray.reverse(); // "Favorites" before "Custom" button
      for (const storeName of namesArray) {
        // Build grid for buttons. Class can decide if vertical or horizontal.
        const storeNameBtn = document.createElement("div");
        storeNameBtn.setAttribute("id", storeName + "_storeBtn");
        storeNameBtn.classList.add("grid_sub_favorites_items"); // grid style
        storeNameBtn.classList.add("handCursor");
        storeNameBtn.textContent = storeName;
        anchor.appendChild(storeNameBtn);

        await setEvtlocalDbBtns(storeNameBtn, storeName);
      }
    });
    resolve();
  });
}

/**
 * Event listener for "Custom" & "Favorites" on "subFilterBar" div.
 * @param {HTMLObjectElement} storeNameBtn
 * @param {string} storeName
 */
function setEvtlocalDbBtns(storeNameBtn, storeName) {
  return new Promise((resolve, _) => {
    storeNameBtn.addEventListener("click", async () => {
      showFavoriteStores(storeName);
    });
    resolve();
  });
}

/**
 * Reused in "favoritesOnStart.js"
 * @param {string} storeName "Favorites" or "Custom"
 */
async function showFavoriteStores(storeName) {
  // Hide the subFilter button grid while stations are shown.
  const subFilterBar = document.getElementById("subFilterBar");
  subFilterBar.style.display = "none";

  // "stationContainer" - div hardcoded in HTML page
  // "stationsAnchor" - anchor div for clicker station name divs stack.
  const anchor = await createContainer("stationContainer", "stationsAnchor");

  // filter group; country(2-char), continent(name), Custom('Custom'),Favorites('Favorites')
  await setActiveStationGroup(storeName);
  // Pull the Custom or Favorites station objects as array.
  const stationsArray = await getIndex({
    dbName: "radio_index_db",
    store: storeName,
  });
  // Create station containers with names clicker,
  // The click builds the UI container with icon bar, play, blacklist btns.
  await stationClickerLinks({
    objList: stationsArray,
    store: storeName,
    parent: anchor,
  });
  // User info on fake screen.
  recMsg([stationsArray.length + " URLs " + storeName]);
}

// ------------------------------------------------------------------------------ Country ----
/**
 * @param {HTMLObjectElement} countryBtn "Country" button topFilter div
 * @param {string} countryName name value of "Country" button topFilter
 */
function countriesBtns(countryBtn, countryName) {
  return new Promise(async (resolve, _) => {
    countryBtn.addEventListener("click", async () => {
      await removeElement("stationsAnchor");

      const anchor = await subFilterContainer();
      anchor.classList.add("grid_sub_countries"); // grid layout, col, rows
      recMsg(["area " + countryName]); // show user selected country name

      const res = await resolveCountryStations(); // dict {countryNames[] , namesTo2Char{} }

      for (const name of res.countryNames) {
        const btn = document.createElement("div");
        btn.setAttribute("id", name + "_storeBtn");
        btn.classList.add("grid_sub_countries_items"); // grid style
        btn.classList.add("handCursor");
        btn.textContent = name;
        anchor.appendChild(btn);

        const twoCharCode = res.namesTo2Char[name];
        await setEvtCountriesBtns(btn, twoCharCode);
      }
    });
    resolve();
  });
}

function setEvtCountriesBtns(btn, twoCharCode) {
  return new Promise((resolve, _) => {
    btn.addEventListener("click", async () => {
      await accessBlock();
      await sleep(100);
      // Container with station clicker links.
      const stationContainer = "stationContainer";
      const anchorName = "stationsAnchor";
      const anchor = await createContainer(stationContainer, anchorName);
      const stationsArray = await countryStations(twoCharCode);
      document.getElementById("subFilterBar").style.display = "none";

      await stationClickerLinks({
        objList: stationsArray,
        store: twoCharCode,
        parent: anchor,
      });
      await accessAllow();
    });
    resolve();
  });
}

/**
 *
 * @param {string} twoCharCode
 * @returns {Array} stations belonging to a country code
 */
function countryStations(twoCharCode) {
  return new Promise((resovlve, _) => {
    const cc = twoCharCode.toUpperCase(); // constants.js has lower case
    let db = metaData.get().infoDb; //  !!! debugger !!! killa, whole DB

    const countryStations = Object.values(db).reduce((accu, station) => {
      // cc is string[], station is object-> .includes only for arrays ------------------------------------ refac -----------
      if (!accu.includes(station) && station.countrycode.includes(cc)) {
        accu.push(station);
      }
      return accu;
    }, []);
    db = null;
    const countryName = metaData.get()["countryNames"][cc];
    recMsg([countryStations.length + " URLs " + countryName]);
    resovlve(countryStations);
  });
}

/**
 * Produce array of country names for buttons and name to 2-char resolver dict.
 * @returns {object} dict with countryNames and country to 2-char codes {germanistan: de}
 */
function resolveCountryStations() {
  return new Promise((resolve, _) => {
    // outsource
    const countryNamesDict = metaData.get()["countryNames"];
    // Cleanup country names and remove garbage. Origin is CSV file red by dbLoader.js.
    const namesTo2Char = Object.keys(countryNamesDict).reduce(
      (accu, twoCharCode) => {
        if (accu === undefined) accu = {};
        let countryName = countryNamesDict[twoCharCode];
        // remove double quotes if any
        if (countryName.slice(0, 1) === '"') {
          countryName = countryName.slice(1, -1);
        }
        if (countryName.length > 0) {
          accu[countryName] = twoCharCode;
        }
        return accu;
      },
      {}
    );

    // Need sorted array for buttons, can not use dict.
    const countryNames = Object.keys(namesTo2Char).reduce(
      (accu, countryName) => {
        if (accu === undefined) accu = [];
        accu.push(countryName);
        return accu;
      },
      []
    );
    resolve({ countryNames: countryNames.sort(), namesTo2Char: namesTo2Char });
  });
}

// ------------------------------------------------------------------------------ World ----
/**
 * Return if world btn press during recording.
 * 50k+ divs high CPU kills recorder.
 *
 * As long as recorder is not a separate process - refac, upgrade to webWorker.
 * @param {string[]} areaNames continents + "world"
 * @param {HTMLObjectElement} worldBtn "World" button div
 * @param {string} worldName name value "World" button topFilter
 */
function worldAreasBtns(areaNames, worldBtn, worldName) {
  return new Promise((resolve, _) => {
    worldBtn.addEventListener("click", async () => {
      const recorderArray = await getIndex({
        dbName: "app_db",
        store: "downloader",
      });

      if (recorderArray.length > 0) {
        await threadOverloadContainer();
        resolve();
        return;
      }
      await removeElement("stationsAnchor");

      const anchor = await subFilterContainer();
      anchor.classList.add("grid_sub_world"); // grid layout, col, rows
      recMsg(["area " + worldName]);

      for (const areaName of areaNames) {
        const btn = document.createElement("div");
        btn.setAttribute("id", areaName + "_storeBtn");
        btn.classList.add("grid_sub_world_items"); // grid style
        btn.classList.add("handCursor");
        btn.textContent = areaName;
        anchor.appendChild(btn);

        await setEvtWorldAreasBtns(btn, areaName);
      }
    });
    resolve();
  });
}

function setEvtWorldAreasBtns(btn, areaName) {
  return new Promise((resolve, _) => {
    btn.addEventListener("click", async () => {
      await accessBlock();
      await sleep(100);
      const stationContainer = "stationContainer";
      const anchorName = "stationsAnchor";
      const anchor = await createContainer(stationContainer, anchorName);
      // areaCountries array pulled from "constants.js"
      const stationsArray = await worldAreaStations(areaName, areaCountries);

      // await setActiveStationGroup(areaName); // if "subFilterBar" shall be visible
      document.getElementById("subFilterBar").style.display = "none";

      await stationClickerLinks({
        objList: stationsArray,
        store: areaName,
        parent: anchor,
      });
      await accessAllow();
    });
    resolve(); // not wait for inner async
  });
}

/**
 * World topFilter.
 * Extract all stations belonging to an array of countries (area).
 * @param {string} areaName continent name or "World"
 * @param {Object} areaCountries dict {continent1: [countryCodes], continent2: [countryCodes] }
 * @returns {Array} stations belonging to a continent (or the whole world, stations dump)
 */
function worldAreaStations(areaName, areaCountries) {
  return new Promise((resolve, _) => {
    const countryTwoChars = areaCountries[areaName].map((cc) =>
      cc.toUpperCase()
    );
    let db = metaData.get().infoDb; // whole DB !!! debugger !!!

    //
    const continentStations = Object.values(db).reduce((accu, station) => {
      const cc = station.countrycode;

      if (
        !accu.includes(station) && // refac - placebo .includes is for []
        countryTwoChars.includes(cc.toUpperCase())
      ) {
        accu.push(station);
      }
      return accu;
    }, []);
    db = null; // mem leak prevention
    recMsg([continentStations.length + " URLs " + areaName]);
    resolve(continentStations);
  });
}

// ------------------------------------------------------------------------------ continents ----
/**
 * Mix out of Country and World filter.
 * (A) SubFilter World shows continent buttons. On button press:
 * (B) SubSubFilter Country del World filter buttons anchor.
 *     Create Country subFilter grid.
 *     Same procedure as Country subFilter.
 *
 * @param {string[]} continents array
 * @param {HTMLObjectElement} countryBtn "Continent" button div
 * @param {string} continentName name value "Continent" button topFilter
 */
function continentBtns(continents, continentBtn, continentName) {
  return new Promise((resolve, _) => {
    continentBtn.addEventListener("click", async () => {
      await removeElement("stationsAnchor");

      const anchor = await subFilterContainer();
      anchor.classList.add("grid_sub_continents");
      recMsg(["area " + continentName]);

      for (const continent of continents) {
        if (continent === "World") continue; // Filter out World.

        const btn = document.createElement("div");
        btn.setAttribute("id", continent + "_storeBtn");
        btn.classList.add("grid_sub_world_items"); // grid style
        btn.classList.add("handCursor");
        btn.textContent = continent;
        anchor.appendChild(btn);

        const countriesOfContinent = areaCountries[continent]; // 2-char country codes
        await setEvtContinentBtns(btn, continent, countriesOfContinent);
      }
    });
    resolve();
  });
}

/**
 * Continent button listener. Click removes the continent button grid.
 * Means subFilter grid changes from buttons with continent names
 * to grid with country names.
 * Style sheets change.
 * @param {HTMLObjectElement} btn
 * @param {string} continent name
 * @param {string[]} countriesOfContinent 2-char codes of countries
 */
function setEvtContinentBtns(btn, continent, countriesOfContinent) {
  return new Promise((resolve, _) => {
    btn.addEventListener("click", async () => {
      const anchor = await subFilterContainer();
      anchor.classList.add("grid_sub_countries"); // grid layout, col, rows
      recMsg(["area " + continent]);

      // input of fun should be 2-char code list
      const data = await resolveCountryStations(); // dict {countryNames[] , namesTo2Char{} }

      // Got an array of 2-char codes, need a sorted list of country button names.
      let countryNames = countriesOfContinent.map((countryCode) => {
        return metaData.get().countryNames[countryCode.toUpperCase()];
      });
      countryNames.sort();

      // Sorted buttons get country names, but button listener fun needs 2-char code.
      for (const name of countryNames) {
        const btn = document.createElement("div");
        btn.setAttribute("id", name + "_storeBtn");
        btn.classList.add("grid_sub_countries_items"); // grid style
        btn.classList.add("handCursor");
        btn.textContent = name;
        anchor.appendChild(btn);

        const twoCharCode = data.namesTo2Char[name];
        await setEvtCountriesBtns(btn, twoCharCode); // reuse country fun
      }
    });
    resolve();
  });
}

// ----------------------------------------------------------------------------------------------

/**
 * Container with an anchor to attach all stations.
 * Anchor can be removed, so no need for a remove loop.
 * @param {*} containerName
 * @param {*} anchorName
 * @returns
 */
function createContainer(containerName, anchorName) {
  return new Promise(async (resolve, _) => {
    await removeElement(anchorName);

    const container = document.getElementById(containerName);
    const anchor = document.createElement("div");
    anchor.id = anchorName;
    container.appendChild(anchor);
    resolve(anchor);
  });
}

/**
 * Fresh subFilterContainer.
 * @returns {HTMLObjectElement} anchor div
 */
function subFilterContainer() {
  return new Promise(async (resolve, _) => {
    const parentName = "subFilterBar";
    const anchorName = "subFilterContainer";

    document.getElementById(parentName).style.display = "block";

    const anchorDiv = await createContainer(parentName, anchorName);
    anchorDiv.style.paddingTop = "1em";
    anchorDiv.style.paddingBottom = "1em";
    resolve(anchorDiv);
  });
}

/**
 * Can synchronous remove a DOM element, anchor.
 * @param {string} HTMLElement id
 * @returns {Promise} done
 * @example
 * await removeElement(anchorName);
 */
function removeElement(elementId) {
  return new Promise(async (resolve, _) => {
    try {
      document.getElementById(elementId).remove();
    } catch (e) {}
    await sleep(100); // DOM is not reliable
    resolve();
  });
}

/**
 * Set a filter group marker.
 * country(2-char), continent(name), Custom('Custom'),Favorites('Favorites')
 * stationGroup' it is used to detect and
 * create a delete button to remove 'Custom' URLs from object store.
 * @param {string} objStore
 */
function setActiveStationGroup(objStore) {
  return new Promise((resolve, _) => {
    metaData.set()["stationGroup"] = objStore;
    resolve();
  });
}
