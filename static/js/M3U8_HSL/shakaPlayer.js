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
 *
 * load unload
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
const manifestUri =
  //"https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd";
  // "https://stream.revma.ihrhls.com/zc1289/hls.m3u8"
  // "http://hls-tvsoyuz.cdnvideo.ru/tvsoyuz/soyuz/playlist.m3u8" // ru church
  // "https://stream.technolovers.fm/vocal-trance"; // mp3 stream works check text
  // "http://streamer.psyradio.org:8010/;listen.mp3" // not working in FF
  //"https://h056.video-stream-hosting.de/medienasa-live/_definst_/mp4:BLKonline_high/playlist.m3u8" // burgenland
  // "http://stream.revma.ihrhls.com/zc1289/hls.m3u8"
  "https://wdrhf.akamaized.net/hls/live/2027995/wdr4/master.m3u8";

async function initPlayer() {
  // Create only "one" Player instance.
  const video = document.getElementById("videoScreen");
  shakaPlayer = new shaka.Player();
  // await shakaPlayer.attach(video);

  // Attach shakaPlayer to the window to make it easy to access in the JS console.
  window.shakaPlayer = shakaPlayer;

  // Listen for error events.
  shakaPlayer.addEventListener("error", onErrorEvent);

/*   shakaPlayer.addEventListener("buffering", (event) => {
    console.log("Buffering state:", event.buffering);
  });
 */
  /* 

  // Try to load a manifest.
  // This is an asynchronous process.
  try {
    await shakaPlayer.load(manifestUri);
    // This runs if the asynchronous load is successful.
    console.log("The video has now been loaded!");
    // shaka.media.SegmentReference to grab loaded chunks for ID3 check
    // getSegmentData(allowDeleteOnSingleUseopt) → {BufferSource}
    // const foo = shakaPlayer.getManifest() //SegmentReference.getSegmentData()
    console.log("getConfiguration->", shakaPlayer.getConfiguration());
    console.log("shaka->", shaka);
    /// const foo1 = shakaPlayer.getSegmentData()
    // save project, copy to uncompiled project and check shakaPlayer object for stream access
    // https://github.com/shaka-project/shaka-shakaPlayer/issues/7763 request filter
    console.log("The video has now been loaded!", shakaPlayer);
    // debugger;
    video.play(); // else stopped

    console.log(shakaPlayer.selectTextTrack());
  } catch (e) {
    // onError is executed if the asynchronous load fails.
    onError(e);
  }
 */

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
