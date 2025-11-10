// uiSettings.js
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

/**
 * App settings switches.
 * All feature settings share a UI template module.
 */

import {
  urlFilter,
  runAnimation,
  storeIncomplete,
  sendStationId,
} from "./uiSettingsFeatures.js";
import { setIdbValue, getIdbValue } from "../database/idbSetGetValues.js";
import {
  createFeatureDivOutline,
  createFeatureDivSection,
} from "../buildGrids/uiSubmenu.js";

export { featSettingStatus, buildSettings };

// sanitize html, else upload mozilla linter cries
// --- ALWAYS ---
// Check zipped pkg on Mozilla Dev site before thinking about an upload,
// ELSE pkg WILL stuck in the Mozilla Q without chance to delete it (bug).
// AND you must rename your pkg. Config files must be changed then :(
const parser = new DOMParser();

/**
 * Entry point to this module.
 * App Settings "Settings" (only), submenu builder.
 * Other settings like blacklist upload, restore, log see
 * the extra modules in this folder. This modules need
 * refactoring; not very readable, split and reuse.
 */
async function buildSettings() {
  await settingsClose();
  await switchMaster(sendStationId);
  await switchMaster(storeIncomplete);
  await switchMaster(runAnimation);
  await switchMaster(urlFilter);
}

/**
 * Call funs needed to build the feature setting dialog.
 * @param {object} kwargs feature dict (urlFilter, ...)
 */
async function switchMaster(kwargs) {
  // Add a section to draw the switch onto.
  await createFeatureDivSection({
    parentId: kwargs.parentId,
    childId: kwargs.id,
  });
  // Reveal if feature is used or not.
  const isActive = await featSettingStatus(
    kwargs.dbName,
    kwargs.objectStoreName,
    kwargs.id,
    kwargs.defaultVal
  );
  // Get the img Dom element from the switch container.
  kwargs.htmlDomImg = await uiContainer(kwargs);
  // Display the correct switch img.src on/off.
  await featSwitchImg(kwargs);
  // Attach the clicker to the DOM img.
  await uiClicker(kwargs);
}

/**
 * Reveals current feature activity.
 * @param {string} dbName
 * @param {string} objectStoreName
 * @param {string} id
 * @param {boolean} defaultVal
 * @returns {boolean} true if ON
 * @example
 * const foo = await featSettingStatus("app_db", "appSettings", "enableAnimations", true)
 */
async function featSettingStatus(dbName, objectStoreName, id, defaultVal) {
  const featObj = await featStatus(dbName, objectStoreName, id);
  const isActive = await featAssert(featObj, defaultVal);
  return isActive;
}

/**
 * Get feature status on/off.
 * indexedDB obj is created only on changing the default value.
 * Means assertion fun must check default state
 * of imported feature dict on error.
 * @param {string} dbName
 * @param {string} objectStoreName
 * @param {string} id
 * @returns {object | string} dict or DB fail msg
 */
function featStatus(dbName, objectStoreName, id) {
  return new Promise(async (resolve, _) => {
    const featObj = await getIdbValue({
      dbName: dbName,
      dbVersion: 1,
      objectStoreName: objectStoreName,
      id: id,
    })
      .then((obj) => {
        return obj;
      })
      .catch((e) => {
        return e;
      });
    resolve(featObj);
  });
}

/**
 * Input is indexedDB return value.
 * Output is true if featStatus.isActive is true.
 * @param {object} featStatus "object" has options
 * @param {object | string | undefined} featStatus.isActive boolean
 * @param {object | string | undefined} message indexedDB err msg
 * @param {object | string | undefined} featStatus undefined
 * @param {boolean} defaultVal default state of switch
 * @returns {boolean}
 */
function featAssert(featStatus, defaultVal) {
  return new Promise((resolve, _) => {
    if (featStatus === undefined) {
      console.error("featAssert->undefined, critical; DB not ready");
      resolve(defaultVal);
    }
    if (featStatus === "FAIL_NO_DATA_IN_STORE") resolve(defaultVal);
    if (featStatus.isActive === true) resolve(true);
    if (featStatus.isActive === false) resolve(false);
  });
}

/**
 * Switch feature on/off.
 * @param {string} dbName
 * @param {string} objectStoreName
 * @param {string} id
 * @param {boolean} isActive
 */
function featSwitchDbVal(dbName, objectStoreName, id, isActive) {
  return new Promise(async (resolve, _) => {
    let state = true; // Zustand

    if (isActive === true) state = false;
    if (isActive === false) state = true;

    await setIdbValue({
      dbName: dbName,
      dbVersion: 1,
      objectStoreName: objectStoreName,
      data: { id: id, isActive: state },
    }).catch((e) => {
      console.error("featSwitchDbVal->" + id, e);
    });
    resolve();
  });
}

/**
 * Show the user feature is on/off.
 * @param {object} kwargs feature dict (urlFilter, ...)
 */
async function featSwitchImg(kwargs) {
  // Read DB for actual feat. state.
  const state = await featSettingStatus(
    kwargs.dbName,
    kwargs.objectStoreName,
    kwargs.id,
    kwargs.defaultVal
  );

  if (state === true) kwargs.htmlDomImg.src = "images/switch-on.svg";
  if (state === false) kwargs.htmlDomImg.src = "images/switch-off.svg";
}

/**
 * Feature UI container.
 * @param {object} kwargs feature dict (urlFilter, ...)
 * @returns {HTMLImageElement} can atach img.src on/off
 */
function uiContainer(kwargs) {
  return new Promise((resolve, _) => {
    const parentDiv = document.getElementById(kwargs.id);
    const featureDiv = document.createElement("div");

    const spanDetails = document.createElement("span");
    spanDetails.style.display = "block";

    const msgHtml = kwargs.msgHtml;
    const details =
      "<details><summary>" +
      kwargs.details +
      "</summary>" +
      msgHtml +
      "</details>";
    const parsed = parser.parseFromString(details, "text/html");
    const tags = parsed.getElementsByTagName("body");
    for (const tag of tags) {
      spanDetails.appendChild(tag);
    }

    const spanTxt = document.createElement("span");
    const imgSwitch = document.createElement("img");
    imgSwitch.id = kwargs.id + "_img";
    imgSwitch.style.width = kwargs.width;

    // Span is simple to move around.
    spanTxt.innerText = kwargs.innerText;
    spanTxt.style.verticalAlign = kwargs.verticalAlign;
    spanTxt.style.marginLeft = kwargs.marginLeft;

    parentDiv.appendChild(featureDiv);
    featureDiv.appendChild(spanDetails);
    featureDiv.appendChild(imgSwitch);
    featureDiv.appendChild(spanTxt);

    resolve(imgSwitch);
  });
}

/**
 * Attach the event listener to the switch img.
 * @param {object} kwargs feature dict (urlFilter, ...)
 */
function uiClicker(kwargs) {
  return new Promise((resolve, _) => {
    // click
    kwargs["htmlDomImg"].addEventListener("click", async () => {
      const switchState = await featSettingStatus(
        kwargs.dbName,
        kwargs.objectStoreName,
        kwargs.id,
        kwargs.defaultVal
      );

      await featSwitchDbVal(
        kwargs.dbName,
        kwargs.objectStoreName,
        kwargs.id,
        switchState
      ).catch((e) =>
        console.error("uiClicker->featSwitchDbVal" + kwargs["id"], e)
      );
      await featSwitchImg(kwargs, switchState);
    });

    resolve();
  });
}

/**
 * Replace the close X button on settings window.
 * Needs investigation. May be we can update the
 * template function used -> "divSettingsOutline".
 * This will have an impact on all other modules
 * using the template.
 */
async function settingsClose() {
  const divOutlineChild = await createFeatureDivOutline({
    parentId: "settings",
    divOutline: "divSettingsOutline",
  });
  divOutlineChild.style.display = "block";

  // remove X that hide the div
  divOutlineChild.removeChild(divOutlineChild.firstElementChild);
  // create customised from template
  // --> refac template to match all feature windows and move to css file.
  const spanClose = document.createElement("span");
  spanClose.classList.add("handCursor");
  spanClose.innerText = "✖";
  spanClose.style.textAlign = "right";
  spanClose.style.paddingRight = "14px";
  spanClose.style.display = "inline-block";
  spanClose.style.width = "100%";
  spanClose.style.backgroundColor = "#fc4a1a";
  spanClose.addEventListener("click", () => {
    document.getElementById("settings").style.display = "none";
  });
  divOutlineChild.appendChild(spanClose);
}
