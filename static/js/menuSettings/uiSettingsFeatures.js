// uiSettingsFeatures.js
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
 * Switchable feature options can be added by creating dictionaries.
 */

export { urlFilter, runAnimation, storeIncomplete, sendStationId };

const urlFilter = {
  id: "filterDoubleUrl", // id (key name) for switch state indexedDB
  dbName: "app_db",
  objectStoreName: "appSettings",
  parentId: "divSettingsOutline", // outer div frame of settings
  defaultVal: true, // feature is active at start
  htmlDomImg: "to_be_created", // img element
  width: "40px", // img width
  details: "clean up Database", // spoiler title above switch
  msgHtml:
    "<br>Delete recouring URLs from loaded DB.<br>" +
    "--- Please reload the app.  ---",
  innerText: "Filter out double URLs on app loading", // text beside switch
  verticalAlign: "14px", // span is simple to move
  marginLeft: "10px",
};

const runAnimation = {
  id: "enableAnimations",
  dbName: "app_db",
  objectStoreName: "appSettings",
  parentId: "divSettingsOutline",
  defaultVal: true,
  htmlDomImg: "to_be_created",
  width: "40px",
  details: "animations",
  msgHtml: "<br>Fun reducer.<br>" + "--- Please reload the app.  ---",
  innerText: "Enable animations",
  verticalAlign: "14px",
  marginLeft: "10px",
};

const storeIncomplete = {
  id: "fileIncomplete",
  dbName: "app_db",
  objectStoreName: "appSettings",
  parentId: "divSettingsOutline",
  defaultVal: false,
  htmlDomImg: "to_be_created",
  width: "40px",
  details: "store incomplete",
  msgHtml:
    "<br>Some radios show always the same text or none at all.<br>" +
    "--- Please reload the app.  ---",
  innerText: "Save incomplete, nameless files. Stop dumps file.",
  verticalAlign: "14px",
  marginLeft: "10px",
};

const sendStationId = {
  id: "sendStationId",
  dbName: "app_db",
  objectStoreName: "appSettings",
  parentId: "divSettingsOutline",
  defaultVal: true,
  htmlDomImg: "to_be_created",
  width: "40px",
  details: "send click",
  msgHtml:
    "<br>Send votes and clicks to the public database." +
    "<br>Pull latest station charts every few minutes.",
  innerText: "Send clicked station ID to radio-browser.info",
  verticalAlign: "14px",
  marginLeft: "10px",
};
