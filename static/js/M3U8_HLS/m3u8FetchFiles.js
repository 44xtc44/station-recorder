// m3u8FetchFiles.js
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
import { sleep } from "../uiHelper.js";
import { connectM3u8 } from "./m3u8StreamDetect.js";
import { writeFileLocal } from "./fileStorage.js";

export { fetchFiles };

let fin = { end: false }; // Dict allows ref to other module; var copies.
/**
 * Walk along the "fetchURLs" filled array index.
 * If new idx (URL) download a file chunk, else idle (idx undefined).
 * @param {Object} playlist dict
 * @param {Object<Array[string]>} URLs captured chunk URLs array
 * @param {Object<Array[string]>} files dl file chunks array
 */
async function fetchFiles(playlist) {
  let idx = 0;

  while (true) {
    const { idle, end } = await urlReady(playlist.URLs[idx], playlist);
    if (end) break;
    if (idle) continue;

    const response = await connectM3u8(playlist.URLs[idx]); // completed download
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
 * @param {number} idx of URL array, num
 * @returns {Object}
 * @returns {Object<boolean>} idle - continue, bool
 * @returns {Object<boolean>} end - break, bool
 */
async function urlReady(idx, playlist) {
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
  if (idx === undefined) return rv;

  rv.idle = false;
  return rv;
}
