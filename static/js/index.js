// index.js
"use strict";
// https://www.gnu.org/licenses/#GPL software; rtf markdownn text
// https://www.gnu.org/licenses/fdl-1.3 documentation;
// https://github.com/mozilla/addons-linter addons-linter vanga-1.0.0.zip
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
 * @author 44xtc44 (René Horn)
 * @version 1.0.0
 * @since 0.0.0
 * @license GPLv3 License (2024-2025), René Horn
 */

// https://palant.info/2022/08/17/impact-of-extension-privileges/

import { sleep } from "./uiHelper.js";
import { createUi } from "./ui.js";
import { createReportConsole } from "./logMonitor/uiReport.js";
import { writeHelloMessage } from "./network/messages.js";
// radio-info-browser
import { setSessionServer } from "./network/publicDbCom.js";
// db
import { delPropIdb } from "./database/idbSetGetValues.js";
import {
  createAppDb,
  createVersionDb,
  createRadioIdxDb, // Place to add public DBs and Favorites station objects
  // tests object store for dev; problem and playlist stations, needs fix refac.
  createDefaultRadios, // dev store with real malfunctioning stations; hardening
} from "./database/idbCreateDefaults.js";
import { logAllDbVersions } from "./database/idbInitDb.js";
// audio, animation
import { initEqualizer } from "./mediaAnimation/equalizer.js";
import {
  prepAnimationMain,
  getAnimationStatus,
} from "./mediaAnimation/animation.js";

import {
  createMediaElements,
  createMainAudioLine,
  connectAnalyserInit,
} from "./mediaAnimation/mediaElements.js";
import { runIntroAnimation } from "./mediaAnimation/intro.js";
import { runDbLoader } from "./central.js";
import {
  waitMsgContainer,
  unlimitedStorageContainer,
} from "./network/messages.js";

import {
  createMenuBarAnim,
  reloaderLogo,
} from "./mediaAnimation/menuBarAnimation.js";
import { createAppMenu } from "./menuSettings/uiHamburger.js";
import { showFavorites } from "./buildGrids/favoritesOnStart.js";
import { launchNoFavPopup } from "./buildGrids/uiPopUpNoFavorites.js";
import { findDuplicateUrl } from "./database/findDuplicateUrls.js";
import { featSettingStatus } from "./menuSettings/uiSettings.js";
const blockAccess = document.getElementById("blockAccess"); // overlay

window.addEventListener("load", async () => {
  // Add images for global use in the app.
  svgDocGlobal("theLogHeadline", "./images/log-headline.svg");
  svgDocGlobal("theDeer", "./images/deer-icon.svg");
  svgDocGlobal("theHandPointer", "./images/hand-point-icon.svg");
  // Unlimited storage, so indexed DB survives browser cleanup.
  const isUnlimited = await askUnlimitedStorage();
  if (!isUnlimited) {
    // Add a message to 'blockAccess'.
    const unlimStorage = await unlimitedStorageContainer();
    await blockAccess.appendChild(unlimStorage);
    await sleep(1000);
    unlimStorage.remove();
    console.log("Object stores may be deleted by browser.");
  }

  await setupDbs();

  await createMediaElements(); // reads/writes settings to iDB
  const runAnimation = await getAnimationStatus();
  await sleep(200); // something wrong with status refac
  if (runAnimation) {
    splashScreen(); // needs createMediaElements; runs beside DB data writer "pouplatepDbs"
  }

  await createReportConsole(); // log monitor with red arrow
  await pouplatepDbs(); // longrunning webWorker

  setSessionServer(); // needs iDB; public DB API server for clicks and votes
  setupUi(runAnimation); // needs DB; audio, intro, DOM input elem values

  blockAccess.style.display = "none"; // Remove input prevention canvas.
  await writeHelloMessage(); // to UI log monitor
  createAppMenu(); // wait report console to set evt app menu
  clearDownloaderStore(); // object in store blocks 'World' btn (CPU overload)

  const urlFilter = await featSettingStatus(
    "app_db",
    "appSettings",
    "filterDoubleUrl",
    true
  );
  if (urlFilter) await findDuplicateUrl();
});

async function setupUi(runAnimation) {
  await reloaderLogo(); // click on it reloads app

  if (!runAnimation) {
    await createMainAudioLine();
    initEqualizer(); // switch EQ into the line, enables speaker
    await showUi();
  } else {
    await createMenuBarAnim();
    await prepAnimationMain(); // Call any longrunning animation in this module.

    await showUi();
    initEqualizer(); // enables speaker after spashScreen anim
    launchNoFavPopup();
  }
}

async function splashScreen() {
  await connectAnalyserInit(); // lightning balls driver with sound
  await runIntroAnimation({ parentId: "blockAccess" });
  await createMainAudioLine(); // intro runs silent, else shocked user
}

async function showUi() {
  await createUi();
  await showFavorites();
}

function setupDbs() {
  return new Promise(async (resolve, _) => {
    // Most modules must read/write local store during init.
    // DB creation in Main Thread, so no need for sophisticated
    // error treatments.
    await createVersionDb();
    await createAppDb();
    await createRadioIdxDb();
    await logAllDbVersions();
    resolve();
  });
}

function pouplatepDbs() {
  return new Promise(async (resolve, _) => {
    // Web worker, keep main thread CPU free for further heavy animations.
    // Will stuck a moment if the customised DB is loaded in Main Thread.
    // 'May' split DB load if the animation is bigger, or try ArrayBuffers transfer.
    // But Main Thread must convert fetch uint8Array to dictionary object. Benefit?
    // https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
    await runDbLoader(); // central.js loads objects into mem, yep 65mb for now
    resolve();
  });
}

/**
 * 'unlimitedStorage' can be set also in manifest.json 'permissions'.
 * If not allowed, broser may delete the indexed DB stores.
 * @returns {Promise} boolean true if allowed
 */
function askUnlimitedStorage() {
  return new Promise((resolve, _) => {
    // Persistent storage.
    if (navigator.storage && navigator.storage.persisted) {
      // unlimetedStorage feature detect, returns boolean
      // persisted() - marked as persisted, a popup waits in FF
      // persist() - permissions request
      navigator.storage.persisted().then((persisted) => {
        // console.log({ persisted });
        navigator.storage.persist().then((allowed) => {
          // console.log({ allowed });
          resolve(allowed);
        });
      });
    } else {
      resolve(false);
    }
  });
}

/**
 * Refuses to run in web worker - refac
 * @returns
 */
function clearDownloaderStore() {
  return new Promise((resolve, _) => {
    delPropIdb({
      idbDb: "app_db",
      idbStore: "downloader",
      clearAll: true,
    }).catch((e) => {
      console.error("clearDownloaderStore->del", e);
      resolve(false);
    });
    resolve(true);
  });
}

/**
 * Every module can grab the image src
 * from everywhere. Can draw more easy
 * on canvas.
 * @param {string} imgName
 * @param {string} relativePathToFile
 * @example
 * svgDocGlobal("theHandPointer", "./images/hand-point-icon.svg")
 * // use for another image as source
 * <img src=document.getElementById('theHandPointer').src >
 */
async function svgDocGlobal(imgName, relativePathToFile) {
  const img = new Image();
  img.id = imgName;
  img.style.display = "none";
  document.body.appendChild(img);

  const svgSource = await svgFileToBase64(relativePathToFile);
  img.src = svgSource;
}

/**
 * This fun is not realy necessary, but an entry point for
 * the next version with heavy SVG animations. MilkDrop?
 * @param {string} relativePathToFile
 * @returns {BinaryType} base64 image, or fun crash
 */
function svgFileToBase64(relativePathToFile) {
  return new Promise(async (resolve, _) => {
    const response = await fetch(relativePathToFile).catch((e) => {
      console.error("svgFileToBase64->", relativePathToFile, e);
      return false;
    });
    // Here we can manipulate the svg colors, show/hide svg groups wit 'regex'.
    // Style attributes must be removed, only the pure stuff.
    const xml = await response.text();
    // Here we can draw it on a canvas, also if the svg is not 100% compatible.
    // Big performance hit, so use it for the background image and store
    // it in canvas mem. Or use div with backgroud image behind canvas.
    let svg64 = btoa(xml);
    let header = "data:image/svg+xml;base64,";
    let image64 = header + svg64;
    resolve(image64);
  });
}
