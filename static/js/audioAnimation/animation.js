// animation.js
"use strict";
/**
 *  This file is part of station-recorder. station-recorder is hereby called the app.
 *  The app is published to be a Standalone Client for public radio and
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

/**
 * Any longrunning animation here.
 * Runs on Browser refresh rate.
 */

import { getIdbValue } from "../database/idbSetGetValues.js";
import { menuBarGalaxy } from "./menuBarAnimation.js";
export { prepAnimationMain, animationMain, getAnimationStatus };

let animationFrameCount = 0; // keep var in module, never 'window'

function prepAnimationMain() {
  return new Promise((resolve, _) => {
    // Kill, if any, inside setTimeout, else it runs forever.
    animationFrameCount = requestAnimationFrame(animationMain);
    resolve();
  });
}

/**
 * Longrunning animations, like in EisenRadio, here.
 */
function animationMain() {
  // console.log("ani->")
  menuBarGalaxy.update(); // radio noise, volume level wheel

  animationFrameCount = requestAnimationFrame(animationMain);
}

function getAnimationStatus() {
  return new Promise(async (resolve, _) => {
    const db = await getIdbValue({
      dbName: "versions_db",
      dbVersion: 1,
      objectStoreName: "dbVersions",
      id: "app_db",
    });
    let anim = await getIdbValue({
      dbName: "app_db",
      dbVersion: db.dbVersion,
      objectStoreName: "appSettings",
      id: "enableAnimations",
    }).catch((e) => {
      return e;
    });

    if (anim === "FAIL_NO_DATA_IN_STORE" || anim.isActive === true) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}
