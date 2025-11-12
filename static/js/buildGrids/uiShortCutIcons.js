// uiShortCutIcons.js
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
import { showFileDbUi } from "../menuSettings/uiFileDownload.js";
import { removeAllRecorder } from "../recordPlay/radioOperation.js";
import { updateRadioBrowserInfoDb } from "../database_update/update_radio_browser_info.js";
export { shortCutIcons };

/**
 * Show icons to update DB, stop all recorder, dump donwloads.
 * ___ "grid_activity_bar"
 * ___ ___ ___ "grid_activity_bar_item" volume , search bar ..
 *         ___ "grid_activity_icon_bar"
 *         ___ ___ ___ "grid_activity_icon_bar_item"
 * 
 * 
 */

function shortCutIcons() {
  return new Promise((resolve, _) => {
    const iconHeight = "32px";
    const gridMaster = "grid_activity_icon_bar";
    const gridItem = "grid_activity_icon_bar_item";

    const activityBar = document.getElementById("activityBar");
    const iconGrid = document.createElement("div");
    iconGrid.id = "iconGrid";
    iconGrid.classList.add(gridMaster);
    iconGrid.classList.add("handCursor");

    // Update Database from public DB.
    const updateDb = document.createElement("div");
    const imgUpdateDb = document.createElement("img");
    imgUpdateDb.id = "imgUpdateDb";
    imgUpdateDb.src = "./images/update-icon.svg";
    imgUpdateDb.style.height = iconHeight;
    updateDb.appendChild(imgUpdateDb);
    updateDb.classList.add(gridItem);

    setBtnEvt(updateDb, updateRadioBrowserInfoDb);

    // Stop all Recorder
    const stopRec = document.createElement("div");
    const imgStopRec = document.createElement("img");
    imgStopRec.id = "imgStopRec";
    imgStopRec.src = "./images/stop-recorder-icon.svg";
    imgStopRec.style.height = iconHeight;
    stopRec.appendChild(imgStopRec);
    stopRec.classList.add(gridItem);

    setBtnEvt(stopRec, removeAllRecorder);

    // Dump downloads.
    const dumpDl = document.createElement("div");
    const imgDumpDl = document.createElement("img");
    imgDumpDl.id = "imgDumpDl";
    imgDumpDl.src = "./images/dump-files-icon.svg";
    imgDumpDl.style.height = iconHeight;
    dumpDl.appendChild(imgDumpDl);
    dumpDl.classList.add(gridItem);

    activityBar.appendChild(iconGrid);
    iconGrid.appendChild(updateDb);
    iconGrid.appendChild(stopRec);
    iconGrid.appendChild(dumpDl);

    setBtnEvt(dumpDl, showFileDbUi);

    resolve();
  });
}

function setBtnEvt(btn, btnAction) {
  btn.addEventListener("click", () => {
    btnAction();
  });
}
