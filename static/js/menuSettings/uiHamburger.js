// uiHamburger.js
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

import { showFileUploadUi } from "./uiFileUpload.js";
import { removeAllRecorder } from "../recordPlay/radioOperation.js";
import { showFileDbUi } from "./uiFileDownload.js";
import { updateRadioBrowserInfoDb } from "../database_update/update_radio_browser_info.js";
import { setAppSettings, getAppSettings } from "../database/idbAppSettings.js";
import { setUploadEvtListener } from "../uiHelper.js";

export { createAppMenu, evtHamburgerMenu };

/**
 *
 */
function createAppMenu() {
  // upload files to database
  const liUpload = document.getElementById("liUpload");
  liUpload.addEventListener("click", () => showFileUploadUi());
  liUpload.style.display = "none";
  // Disable dev upload menu entry; FF android multi dl bug report.
  // const liUpload = document.getElementById("liUpload");
  // click 7-times red arrow, arrow is called in writeHelloMessage
  setUploadEvtListener();

  // audio bar show/hide
  evtHamburgerMenu({ menuName: "liAudio", featureDivId: "audioBarContainer" });
  getMenuShown({ menuName: "liAudio", featureDivId: "audioBarContainer" });

  // settings bar show/hide
  evtHamburgerMenu({
    menuName: "liSettings",
    featureDivId: "divRowSettings",
  });
  getMenuShown({ menuName: "liSettings", featureDivId: "divRowSettings" });

  // log monitor show/hide
  getMenuShown({ menuName: "liLogView", featureDivId: "reportMonitor" });
  evtHamburgerMenu({ menuName: "liLogView", featureDivId: "reportMonitor" });

  // github
  const liGit = document.getElementById("liGit");
  liGit.addEventListener("click", () => {
    window.open("https://github.com/44xtc44/station-recorder", "_blank");
  });
}

async function getMenuShown(o = {}) {
  const menuName = o.menuName;
  const featureDivId = o.featureDivId;
  const menuOption = document.getElementById(menuName);
  const elem = document.getElementById(featureDivId);

  // get
  let elemDict = await getAppSettings({ id: featureDivId }).catch(() => {
    console.log("get DB not avail yet->", featureDivId);
  });
  if (!elemDict || elemDict === undefined) {
    // set
    await setAppSettings({ id: featureDivId, setDisplay: "block" }).catch(
      () => {
        console.log("set DB not avail yet->", featureDivId);
      }
    );
    elem.style.display = "block";
    menuOption.style.color = "#49bbaa";
    return;
  }
  if (elemDict.setDisplay === "block") {
    elem.style.display = "block";
    menuOption.style.color = "#49bbaa";
  }
  if (elemDict.setDisplay === "none") {
    elem.style.display = "none";
    menuOption.style.color = "lightyellow";
  }
}

/**
 *
 * @param {*} o
 */
function evtHamburgerMenu(o = {}) {
  const menuName = o.menuName;
  const featureDivId = o.featureDivId;
  const menuOption = document.getElementById(menuName);
  menuOption.addEventListener("click", () => {
    setEvtMenu({ menuName: menuName, featureDivId: featureDivId });
  });
}

async function setEvtMenu(o = {}) {
  const menuName = o.menuName;
  const featureDivId = o.featureDivId;
  const menuOption = document.getElementById(menuName);
  const elem = document.getElementById(featureDivId);
  let elemDict = await getAppSettings({ id: featureDivId }).catch(() => {
    console.log("get DB not avail yet->", featureDivId);
  });
  if (!elemDict) {
    await setAppSettings({ id: featureDivId, setDisplay: "block" }).catch(
      () => {
        console.log("set DB not avail yet->", featureDivId);
      }
    );
    elem.style.display = "block";
    menuOption.style.color = "#49bbaa";
    return;
  }
  if (elemDict.setDisplay === "block") {
    elem.style.display = "none";
    menuOption.style.color = "lightyellow";
    await setAppSettings({ id: featureDivId, setDisplay: "none" });
  }
  if (elemDict.setDisplay === "none") {
    elem.style.display = "block";
    menuOption.style.color = "#49bbaa";
    await setAppSettings({ id: featureDivId, setDisplay: "block" });
  }
}
