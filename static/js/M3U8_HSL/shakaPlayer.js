// shakaPlayer.js
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
 * Shaka player is called in script mode, not module in HTML file.
 * So it is available in all modules.
 */
export { shakaPlayer, initShakaApp };
let shakaPlayer = null;

function initShakaApp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    // Everything looks good!
    initPlayer();
  } else {
    // This browser does not have the minimum set of APIs we need.
    console.error("Browser not supported!");
  }
}

async function initPlayer() {
  // Create only "one" Player instance.
  const video = document.getElementById("videoScreen");
  shakaPlayer = new shaka.Player();
  await shakaPlayer.attach(video);

  // Attach shakaPlayer to the window to make it easy to access in the JS console.
  window.shakaPlayer = shakaPlayer;

  // Listen for error events.
  shakaPlayer.addEventListener("error", onErrorEvent);

  // Remove nasty spinner.
  shakaPlayer.addEventListener("buffering", function (event) {
    spinner.style.display = event.buffering ? "block" : "none";
  });
}

function onErrorEvent(event) {
  // Extract the shaka.util.Error object from the event.
  onError(event.detail);

  if (isNotRecoverableError(event)) {
    session.stopStreamingSession();
  }
}

function onError(error) {
  // Log the error.
  console.error("Error code", error.code, "object", error);
}

document.addEventListener("DOMContentLoaded", initShakaApp);
