// m3u8Downloader.js

/**
 * Should be the webWorker caller, handle msg transfer (log), UI write.
 *
 * https://groups.google.com/g/shaka-player-users/c/WIia9KpWfIc
 * https://v2-0-0-beta3-dot-shaka-player-demo.appspot.com/docs/api/tutorial-basic-usage.html
 * https://v2-0-0-beta3-dot-shaka-player-demo.appspot.com/docs/api/tutorial-debugging.html
 * dIST https://app.unpkg.com/shaka-player@2.5.4/files/dist
 *
 * offline playback, storage https://dev.to/vanyaxk/shaka-player-for-media-playback-implementation-use-cases-pros-and-cons-3b87
 *
 * https://blog.openreplay.com/how-to-use-client-and-server-side-web-workers/
 */
import { metaData } from "../central.js";
import { fetchURLs } from "./m3u8FetchURLs.js";
import { fetchFiles } from "./m3u8FetchFiles.js";
import { connectM3u8 } from "./m3u8StreamDetect.js";
import { processM3u8 } from "./m3u8Reader.js";

export { locateTarget, m3u8Download };

/**
 * HLS M3U8 Downloader starter.
 * Playlist dict for metadata, chunk URLs and chunk storage.
 * Start recorder threat loops.
 * @param {string} playlistURL str
 * @param {string} stationuuid str
 */
async function m3u8Download(playlistURL, stationuuid) {
  const station = metaData.get().infoDb[stationuuid];
  /**
   * Migrate loops to webWorker process.
   */
  let playlist = {
    URLs: [], // URL has mostly an ascending file names inside.
    files: [], // Fetched stream chunks from URLs.
    // sourceBuffer: [], // video/audio player buf feed queue->remove item
    contentType: "", // set from response header in "fetchFiles()" "audio/aac" blob bug FireFox
    // chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/heads/master/media-source/mediasource-is-type-supported.html
    metadata: {}, // playlist options for dl/play control; +debug
    stationuuid: stationuuid,
    stationName: station.name,
    artistInfo: {
      current: { artist: "", title: "" },
      archive: { artist: "foo", title: "bar" },
    },
  };

  const url = await locateTarget(playlistURL); // playlist server

  /**
   * Worker gets playlist dict to share among its imported modules.
   * Worker starts fetch loops and sends UI messages to Caller.
   * Caller updates UI and closure (metadata).
   * Caller tracks when to finish.
   */
  fetchURLs(url, playlist);
  fetchFiles(playlist);
}

/**
 * Needs a pre-select fun if multiple URLs available.
 * m3u8 host will be replaced by redirect server, if any found.
 * @param {string} playlistURL
 * @returns {Response || false } Response or false
 */
async function locateTarget(url) {
  const response = await connectM3u8(url);
  if (response === false) return false;

  const m3u8 = await processM3u8(response);
  const { isRedirect, redirectUrl } = await redirectUrlGet(m3u8.chunkURLs);
  if (isRedirect) return redirectUrl; // central name server -> playlist server
  if (!isRedirect) return url;
}

/**
 * Redirected playlist URLs if any.
 * @param {Array<string>} urls and metadata lines
 * @returns {Object} false, empty if none
 * @returns {Object<boolean>} isRedirect
 * @returns {Object<string>} redirectUrl
 */
async function redirectUrlGet(urls) {
  // Get out early.
  for await (const url of urls) {
    if (url.toLowerCase().includes(".m3u8")) {
      // --> FIRST URL so far, can get an option feature
      return { isRedirect: true, redirectUrl: url };
    }
  }
  return { isRedirect: false, redirectUrl: "" };
}
