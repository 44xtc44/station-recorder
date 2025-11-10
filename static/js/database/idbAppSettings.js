// idbAppSettings.js
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

import { getIdbValue, setIdbValue } from "./idbSetGetValues.js";
export { getAppSettings, setAppSettings };

/**
 * Argument dict will be stored in objectStore.
 * Made just for 'appSettings' store.
 * @param {*} o 
 * @returns 
 */
function setAppSettings(o = {}) {
  return new Promise((resolve, _) => {
    setIdbValue({
      dbName: "app_db",
      dbVersion: 1,
      objectStoreName: "appSettings",
      data: o, // { id: eqRange, range: "winamp" },
    }).then(() => {
      resolve();
    });
  });
}

/**
 * app_db/appSettings object
 * @param {*} o 
 * @returns An object with id and one or more values.
 */
function getAppSettings(o = {}) {
  return new Promise((resolve, _) => {
    getIdbValue({
      dbName: "app_db",
      dbVersion: 1,
      objectStoreName: "appSettings",
      id: o.id,
    })
      .then((result) => {
        resolve(result);
      })
      .catch(() => {
        // e -> FAIL_NO_DATA_IN_STORE
        resolve(false);
      });
  });
}
