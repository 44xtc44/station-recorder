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
import { recMsg } from "../network/messages.js";
import { switchRecorderState } from "../recordPlay/recordStream.js";

export { locateTarget, m3u8Download };

/**
 * HLS M3U8 Downloader starter.
 * Playlist dict for metadata, chunk URLs and chunk storage.
 * Start recorder threat loops.
 * ContentType of chunk URLs is not the same as pulling the .m3u8 file.
 * Means it needs a URL run to decide recording the URL endpoint file type.
 * .ts files are video container and as concatenated file chunks not playable
 * if dumped to disk, so far. Using shaka.offline to scratch chunks out of
 * the database is a challenge. Needs also time sync and repackaging video
 * container.
 * .aac files can be concatenated, dumped and played.
 * @param {string} playlistURL str
 * @param {string} stationuuid str
 */
async function m3u8Download(playlistURL, stationuuid) {
  const funEnabled = false;
  if (!funEnabled) {
    /**
     * Disabled.
     * Future use.
     * Raw audio seems to work.
     * Video container streams need external library.
     */
    await switchRecorderState(stationuuid);
    return;
  }

  const station = metaData.get().infoDb[stationuuid];

  /**
   * Migrate loops to webWorker process.
   */
  let playlist = {
    URLs: [], // URL has mostly an ascending file names inside.
    files: [], // Fetched stream chunks from URLs.
    // chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/heads/master/media-source/mediasource-is-type-supported.html
    metadata: {}, // playlist options for dl/play control; +debug
    contentType: "",
    stationuuid: stationuuid,
    stationName: station.name,
    artistInfo: {
      current: { artist: "", title: "", img: "" },
      archive: { artist: "foo", title: "bar", img: "" }, // dev
    },
    dumpIncomplete: station.dumpIncomplete,
  };

  const url = await locateTarget(playlistURL); // server

  const { contentType, error } = await streamType(url); // Will the dump be playable later?
  if (error) return;
  if (!contentType.includes("audio")) {
    recMsg(["fail :: NO_RECORD_MPEG_TS ", contentType]);
    return;
  }
  recMsg(["m3u8 ", contentType]);
  playlist.contentType = contentType;

  /**
   * If worker:
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

/**
 *
 * @param {string} playlistURL
 * @returns {Promise<undefined>}
 */
async function streamType(playlistURL) {
  const responseM3U8 = await connectM3u8(playlistURL);
  if (responseM3U8 === false) return { error: true };

  const { chunkURLs } = await processM3u8(responseM3U8);
  const responseURL = await connectM3u8(chunkURLs[0]);
  if (responseURL === false) return { error: true };
  return { error: false, contentType: responseURL.headers.get("Content-Type") };
}
