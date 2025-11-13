// m3u8Downloader.js

/**
 * Should be a webWorker.
 * Need runner to choose download, play or both
 * if possible, else msg to UI.
 * https://groups.google.com/g/shaka-player-users/c/WIia9KpWfIc
 * https://v2-0-0-beta3-dot-shaka-player-demo.appspot.com/docs/api/tutorial-basic-usage.html
 * https://v2-0-0-beta3-dot-shaka-player-demo.appspot.com/docs/api/tutorial-debugging.html
 * dIST https://app.unpkg.com/shaka-player@2.5.4/files/dist
 * 
 * offline playback, storage https://dev.to/vanyaxk/shaka-player-for-media-playback-implementation-use-cases-pros-and-cons-3b87
 */

import { artistReader } from "./m3u8ArtistReader.js";
import { writeFileLocal } from "./fileStorage.js";
import { connectM3u8 } from "./m3u8StreamDetect.js"; 
import { processM3u8, responseTxtArray } from "./m3u8Reader.js";

// import { media } from "./m3u8SharedMedia.js";
import { sleep } from "../uiHelper.js";
// import {shaka} from "../assets/shaka-player.compiled.js"

export { locateTarget, m3u8Download, fin };

let fin = { end: false }; // Dict allows ref to other module; var copies.

/**
 * Controller.
 * @param {string} playlistURL
 */
async function m3u8Download(playlistURL) {
  const finBtn = document.getElementById("fin");
  finBtn.addEventListener("click", () => {
    fin.end = true;
  });

  let playlist = {
    URLs: [], // URL has mostly an ascending file names inside.
    files: [], // Fetched stream chunks from URLs.
    sourceBuffer: [], // video/audio player buf feed queue->remove item
    contentType: "", // Must be supported by DOM "MediaSource" (no .ts file,,)
    // chromium.googlesource.com/external/w3c/web-platform-tests/+/refs/heads/master/media-source/mediasource-is-type-supported.html
    metadata: {}, // playlist options for dl/play control; +debug
  };

  const url = await locateTarget(playlistURL); // playlist server
  // Loops.
  fetchURLs(url, playlist); // from playlist server with metadata timeout
  fetchFiles(playlist); // chunk download
}

/**
 * Needs a pre-select fun if multiple URLs available.
 * m3u8 host will be replaced by redirect server, if any found.
 * @param {string} playlistURL
 * @returns {Response}
 */
async function locateTarget(url) {
  // let url = "https://augsburgtv.iptv-playoutcenter.de/augsburgtv/augsburgtv.stream_1/playlist.m3u8"
  // let url =
  //   "https://swrswr3vr-hls.akamaized.net/hls/live/2018683/swr3vr/master.m3u8";
  //let url =
  //  "https://stream.revma.ihrhls.com/zc593/66_1jz3gmo0magf802/playlist.m3u8";
  // let url = "https://wdrhf.akamaized.net/hls/live/2027995/wdr4/master.m3u8"; // multi redirects
  // let url = "https://wdrhf.akamaized.net/hls/live/2027995/wdr4/96/seglist.m3u8"; // 1800 URLs in one playlist
  // let url = "http://stream.mediawork.cz/retrotv/retrotvHQ1/playlist.m3u8"; // aborted Retro Music Television cz
  // let url = "http://stream.revma.ihrhls.com/zc6951/hls.m3u8";
  // let url = "http://stream.revma.ihrhls.com/zc1289/hls.m3u8"; // redirect aac
  // let url = "http://hls-tvsoyuz.cdnvideo.ru/tvsoyuz/soyuz/playlist.m3u8" // ru church
  // let url = "https://mcdn.hf.br.de/br/hf/br24/master-96000.m3u8"; // B24
  // let url = "https://stream.technolovers.fm/vocal-trance" // mp3 stream nok -> no m3u8 here

  const response = await connectM3u8(url);
  if (response === false) return false;

  const m3u8AsArray = await responseTxtArray(response);
  const { isRedirect, redirectUrl } = await redirectUrlGet(m3u8AsArray);
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
 * Stream chunk URL array writer.
 * @param {string} url
 * @param {Object} playlist
 */
async function fetchURLs(url, playlist) {
  while (true) {
    const delay = 1000; // multiply, some TARGETDURATION has single digits
    let lenChunkURLs = 2; // default multiply on error
    const response = await connectM3u8(url);
    if (!response) {
      console.error("m3u8, fetchURLs->response error");
      break;
    }

    const { chunkURLs, metadata } = await processM3u8(response);

    try {
      lenChunkURLs = chunkURLs.length;
      // Merge existing with new URLs without duplicates.
      playlist.URLs = [...new Set([...playlist.URLs, ...chunkURLs])];
      // Overwrite artist/pic info; sourceBuffer feeder module may display it.
      playlist.metadata = metadata;
    } catch (e) {
      console.error("m3u8, fetchURLs->lenChunkURLs", lenChunkURLs);
    }

    // Fetch interval; no segment should exceed X seconds
    let duration = playlist.metadata["#EXT-X-TARGETDURATION"];
    if (isNaN(Number(duration))) {
      duration = delay; // dl every second; Srv may disconnect on too small.
    } else {
      duration = Number(duration) * delay;
    }

    await artistReader(playlist);
    // UI var if we should break.
    if (fin.end === true) break;

    console.log("duration->", duration, playlist.URLs, playlist.files);
    await sleep(duration * lenChunkURLs);
  }
}

/**
 * Walk through the "fetchURLs" filled array.
 * If new idx (URL) is available download, else idle.
 * @param {Object} playlist cross modules container; dl/feed video
 * @param {Object<Array[string]>} URLs captured chunk URLs
 * @param {Object<Array[string]>} files dl file chunks
 */
async function fetchFiles(playlist) {
  let idx = 0;

  while (true) {
    const { idle, end } = await urlReady(playlist.URLs[idx], playlist);
    if (end) break;
    if (idle) continue;

    const response = await connectM3u8(playlist.URLs[idx]);
    if (response === undefined) {
      console.error(
        "fetchFiles-connectM3u8->",
        "no connection to ",
        playlist.URLs[idx]
      );
    }
    idx++;

    const chunk = await response.body.getReader().read();
    if (chunk.done) {
      fin.end = true;
      console.error("fetchFiles-connectM3u8->chunk.done");
      break; // .done; Not an endless stream, but file.
    }

    /**
     * Read ID3Data from uint8Array
     */
    // ID3 tags found in data starting at offset (0 is default)
    const ID3Data = shaka.util.Id3Utils.getID3Data(chunk.value, 0);
    // Returns "Array" of ID3 frames found in all of the ID3 tags
    // "key" PRIV, TIT2, TPE1; "data" stream protocol, title, artist name, so far
    // ID3Frames.lenght is 0 if no tags found
    const ID3Frames = shaka.util.Id3Utils.getID3Frames(ID3Data);

    // Offline boolean
    const offline = shaka.offline.Storage.support();

    // shaka.media.SegmentReference to grab loaded chunks for ID3 check
    // getSegmentData(allowDeleteOnSingleUseopt) → {BufferSource}

    // contentType - shaka.Player.stream.mimeType
    // https://harmonicinc-com.github.io/shaka-player/v3.0.7+harmonic/docs/api/shaka.extern.html

    playlist.files.push(chunk.value);
    // playlist.sourceBuffer.push(chunk.value); // not needed if shaka works
    playlist.contentType = response.headers.get("content-type");

    // UI var if we should break.
    if (fin.end === true) {
      await writeFileLocal({
        chunkArray: playlist.files,
        contentType: playlist.contentType,
        title: "_incomplete_" + Date.now(),
        bitRate: " ",
        radioName: "fileDl",
      });
      break;
    }
  }
}

/**
 * Helper for "fetchFiles".
 * @param {string} url
 * @returns {Object}
 * @returns {Object<boolean>} idle - continue
 * @returns {Object<boolean>} end - break
 */
async function urlReady(url, playlist) {
  await sleep(100);
  const rv = { idle: true, end: false };

  if (fin.end === true) {
    rv.end = true;
    await writeFileLocal({
      chunkArray: playlist.files,
      contentType: playlist.contentType,
      title: "_incomplete_" + Date.now(),
      bitRate: " ",
      radioName: "idle",
    });
  }
  if (url === undefined) return rv;

  rv.idle = false;
  return rv;
}
