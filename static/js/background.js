// background.js
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
 * Loader of the Browser Add-on.
 * https://stackoverflow.com/questions/69296754/chrome-extension-action-onclicked
 * Called when the user clicks on the browser action.
 */
chrome.action.onClicked.addListener((tab) => {
  // Send a message to the active tab
  chrome.tabs.create({ url: "/static/addon.html" }).then(() => {
    (async () => {
      const tab = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      // console.log("tab_id->", tab[0].id);
      chrome.scripting.executeScript({
        target: { tabId: tab[0].id, allFrames: true },
        files: ["/static/js/background.js"],
        // code: `console.log('Add-on creator:', '44xtc44');`,
      });
    })();
  });
});
