// uiReport.js
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
export { createReportConsole };

/**
 * Frame for the interactive log monitor.
 * Was used to dev the lines (reportConsole_1, ...) also.
 * Now (in messages.js) the monitor lines
 * are made dynamically on every new message.
 * Like an old TV / monitor with "line transformer".
 * Used by recMsg() also in messages.js
 */
function createReportConsole() {
  return new Promise((resolve, _) => {
    const reportContainer = document.getElementById("reportContainer");
    // Background in default color for overlay with rounded corners left and right on top.
    const bgMonitorPrimer = document.createElement("div");
    bgMonitorPrimer.id = "bgMonitorPrimer";
    bgMonitorPrimer.classList.add("bgMonitorPrimer");
    // Rounded upper corners.
    const bgMonitorCorners = document.createElement("div");
    bgMonitorCorners.id = "bgMonitorCorners";
    bgMonitorCorners.classList.add("bgMonitorCorners");
    // Background image container.
    const bgImgContainer = document.createElement("div");
    bgImgContainer.id = "bgImgContainer";
    bgImgContainer.classList.add("bgImgContainer");
    // Background image.
    const bgImg = document.createElement("img");
    bgImg.id = "bgImgLogMonitor";
    bgImg.style.width = "120px";
    bgImg.src = ""; /* "./images/satellite-icon.svg"; */
    bgImg.classList.add("bgImgLogMonitor");
    bgImgContainer.appendChild(bgImg);

    // Text lines container.
    const reportMonitor = document.createElement("div");
    reportMonitor.setAttribute("id", "reportMonitor");
    reportMonitor.style.position = "relative"; // keep divArrow in the wrapper boundaries
    reportMonitor.classList.add("reportMonitor");

    // Child stack.
    reportContainer.appendChild(bgMonitorPrimer);
    bgMonitorPrimer.appendChild(bgMonitorCorners);
    bgMonitorCorners.appendChild(reportMonitor);
    bgMonitorCorners.appendChild(bgImgContainer);

    resolve();
  });
}
