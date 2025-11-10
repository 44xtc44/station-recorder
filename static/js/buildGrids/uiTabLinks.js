// uiTabLinks.js
// https://www.w3schools.com/howto/howto_js_tabs.asp
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

export { createTabLinkBarSettings, tabBar };

/**
 * A good idea for a web site but a total fail for 
 * a more technical document. Switching funs too complicated.
 * Use div as button. refac
 */
function tabBar(element, btnName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(btnName).style.display = "block";
  element.className += " active";
}

function createTabLinkBarSettings() {
  const settingsClicker = document.getElementById("settingsClicker");
  const addUrlsClicker = document.getElementById("addUrlsClicker");
  const blAddClicker = document.getElementById("blacklistUploadClicker");
  const blDumpClicker = document.getElementById("blacklistDumpClicker");
  const logHistoryClicker = document.getElementById("logHistoryClicker");

  settingsClicker.addEventListener("click", () => {
    tabBar(settingsClicker, "settings");
  });
  addUrlsClicker.addEventListener("click", () => {
    tabBar(addUrlsClicker, "urlsAdd");
  });
  blAddClicker.addEventListener("click", () => {
    tabBar(blAddClicker, "blacklistAdd");
  });
  blDumpClicker.addEventListener("click", () => {
    tabBar(blDumpClicker, "blacklistDump");
  });
  logHistoryClicker.addEventListener("click", () => {
    tabBar(logHistoryClicker, "logHistory");
  });
}
