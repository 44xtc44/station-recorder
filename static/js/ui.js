// ui.js
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

// "topFilterBtn" Try out only Favorites, countries, continent buttons
// import { topFilterBtn } from "./buildGrids/topFillterGrid.js";
import { topFilterButtons } from "./buildGrids/topFilterGrid.js";
import { searchInputBar } from "./buildGrids/uiSearch.js";
import { loadBlacklist } from "./fileStorage/blacklist.js";
import { createTabLinkBarSettings } from "./buildGrids/uiTabLinks.js";
import { buildUrlsAdd } from "./menuSettings/uiSettingsUrlsAdd.js";
import { buildSettingsBlackAdd } from "./menuSettings/uiSettingsBlackAdd.js";
import { buildSettingsBlackDump } from "./menuSettings/uiSettingsBlackDump.js";
import { buildLogHistory } from "./menuSettings/logHistory.js";
import { createActivityPlayer } from "./network/streamActivity.js";
import { intervalGetOpenGridData } from "./network/publicDbCom.js";
import { buildSettings } from "./menuSettings/uiSettings.js";
import { shortCutIcons } from "./buildGrids/uiShortCutIcons.js";
import { showRecorderActive } from "./buildGrids/radioOperation.js";

export { createUi };

/**
 * All UI segments from here.
 * @param {*} .
 */
async function createUi() {

  createTabLinkBarSettings();
  // topFilterBtn(); // Try out only Favorites, countries, continent buttons
  topFilterButtons();
  // ActivityBar needs div creation as a sequence.
  await createActivityPlayer(); // grid radio playing, rec under log monitor
  await searchInputBar();
  await shortCutIcons();

  loadBlacklist(); // preload from blacklist stores

  buildSettings();
  buildUrlsAdd();
  buildSettingsBlackAdd();
  buildSettingsBlackDump();
  buildLogHistory();

  
  setInterval(intervalGetOpenGridData, 180000); // pull stats from public API
  setInterval(showRecorderActive, 2000); // audio volume slider, knob or golden disk
}
