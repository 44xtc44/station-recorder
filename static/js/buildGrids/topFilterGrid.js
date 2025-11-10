// topFilterGrid.js
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

// {Asia: asia_countries, Africa: africa_countries,}
import { continentCountries } from "../constants.js";
import {
  countriesBtns,
  continentBtns,
  localDbBtns,
  worldAreasBtns,
} from "./subFilterGrid.js";
export { topFilterButtons };

/**
 * topFilterKeyName buttons get three different listeners.
 * countryBtns - public DB stations
 * localDbBtns - local indexed DB Favorites and Custom
 * worldAreasBtns - 'World' btn full public DB, other btn .flat of topFilterKeyName countries
 * @returns {Promise} undefined
 */
function topFilterButtons() {
  return new Promise((resolve, _) => {
    const topFilterBar = document.getElementById("topFilterBar");
    const filterBarContainer = document.getElementById("filterBarContainer");
    filterBarContainer.classList.add("defaulColor");
    const topFilterAnchor = document.createElement("div");
    topFilterAnchor.id = "topFilterAnchor";
    topFilterAnchor.classList.add("grid-topFilterBar");
    topFilterBar.appendChild(topFilterAnchor);

    //
    for (const [topFilterKeyName, topFilterValue] of Object.entries(
      continentCountries
    )) {
      const topFilterBtn = document.createElement("div");
      topFilterBtn.setAttribute("id", topFilterKeyName + "_button");
      topFilterBtn.classList.add("grid-topFilterBar-item"); // gets a listener
      topFilterBtn.classList.add("handCursor");
      topFilterBtn.textContent = topFilterKeyName;
      topFilterAnchor.appendChild(topFilterBtn);

      // Favorites are from local store indexed DB.
      // Favorites and World station objects can not be filtered by country code.
      if (topFilterKeyName === "Favorites")
        localDbBtns(topFilterValue, topFilterBtn, topFilterKeyName);
      if (topFilterKeyName === "World")
        worldAreasBtns(topFilterValue, topFilterBtn, topFilterKeyName);

      if (topFilterKeyName === "Country")
        countriesBtns(topFilterBtn, topFilterKeyName);
      if (topFilterKeyName === "Continent")
        continentBtns(topFilterValue, topFilterBtn, topFilterKeyName);
    }
    resolve();
  });
}
