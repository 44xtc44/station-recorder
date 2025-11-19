// m3u8FetchURLs.js
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
import { artistReader } from "./m3u8ArtistReader.js";
import { connectM3u8 } from "./m3u8StreamDetect.js";
import { processM3u8 } from "./m3u8Reader.js";

export { fetchURLs };

let fin = { end: false }; // Dict allows ref to other module; var copies.

/**
 * Stream URLs array writer.
 * Each file chunk has an own URL in the .m3u8 server response txt file.
 * @param {string} url str
 * @type {object} playlist dict
 * @param {Array<string>} URLs array of strings
 * @param {Array<string>} metadata array of strings
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
