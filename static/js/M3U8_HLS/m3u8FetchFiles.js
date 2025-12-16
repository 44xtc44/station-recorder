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
import { recMsg } from "../network/messages.js";
import { sleep } from "../uiHelper.js";
import { metaData } from "../central.js";
import { connectM3u8 } from "./m3u8StreamDetect.js";
import { storeBlobAsObj } from "../fileStorage/fileStorage.js";
import { writeBlacklist } from "../fileStorage/blacklist.js";
import { scan, toBin, detachID3, removeADTS } from "./m3u8ADTSripper.js";

export { fetchFiles };

/**
 * Use some parts of streamDataGet.js, but not a real stream here.
 * Walk along the "fetchURLs" filled URLs array index.
 * If new urlIdx (URL) download a file chunk, else idle (urlIdx undefined).
 *
 * Chunk is (in this module) a complete downloaded file part of an URL endpoint.
 * @typedef {Object} arguments dict
 * @typedef {Object} playlist dict
 * @param {Object<Array[string]>} playlist.URLs captured chunk URLs array
 * @param {Object<Array[string]>} playlist.files dl file chunks array
 * @typedef {boolean} dumpIncomplete UI setting, bool
 * @typedef {HTMLDivElement} activityDiv grid to draw recorder name
 */
async function fetchFiles(playlist) {
  const stationuuid = playlist.stationuuid;
  let urlIdx = 0;
  let titleCount = 0; // 1, means first title is always incomplete
  let titleToWrite = ""; // current title awaits end, so we can write blob
  let ID3Frame = undefined; // file header for dump

  // test if removable, DB init concats custom Station to in-mem DB --> streamDataGet.js
  if (stationuuid === undefined) {
    stationuuid = "sr-custom-" + playlist.stationName; // custom URL can not have uuid from public DB
  }

  while (true) {
    const { idle, end } = await urlReady(playlist.URLs[urlIdx], playlist);
    if (end) break;
    if (idle) continue;

    const response = await connectM3u8(playlist.URLs[urlIdx]); // completed download

    if (response === undefined) {
      console.error(
        "fetchFiles-connectM3u8->",
        "no connection to ",
        playlist.URLs[urlIdx]
      );
      continue;
    }
    urlIdx++;

    let chunk = undefined; // fetch URL dito
    try {
      chunk = await response.body.getReader().read();
    } catch (e) {
      continue;
    }
    if (response === undefined) {
      console.error(
        "fetchFiles-response.body.getReader->",
        playlist.URLs[urlIdx]
      );
      continue;
    }
    if (chunk.done) {
      console.error("fetchFiles-connectM3u8->chunk.done");
      break; // .done; Not an endless stream, but file.
    }

    const current = await title(playlist.artistInfo.current);
    const { change } = await changed(current, titleToWrite);
    /* 
    if (!change) {
      // if (ID3Data.length > 0) ID3Frame = ID3Data;
      // playlist.files.push(await removeADTS(chunk.value));
      chunk.value = await removeADTS(chunk.value);
      playlist.files.push(chunk.value);
      continue;
    }
 */
    /*     if (change) {
      titleCount++;
      if (titleCount === 1) {
        await incompleteDump(titleToWrite, playlist);
      }
      if (titleCount > 1) {
        await completeDump(titleToWrite, playlist);
      }
    }
     */
    // After change playlist.files is empty, dumped.
    // if (ID3Data.length > 0) ID3Frame = ID3Data;
    // playlist.files.push(await removeADTS(chunk.value));
    chunk.value = await removeADTS(chunk.value);
    playlist.files.push(chunk.value);
    titleToWrite = current;
  }
}

/**
 * Helper for "fetchFiles".
 * @param {number} urlIdx of URL array, num
 * @returns {Object}
 * @returns {Object<boolean>} idle - continue, bool
 * @returns {Object<boolean>} end - break, bool
 */
async function urlReady(urlIdx, playlist) {
  const stationuuid = playlist.stationuuid;
  const rv = { idle: true, end: false };
  await sleep(100);

  if (!metaData.get().infoDb[stationuuid].isRecording) {
    rv.end = true;

    const titleToWrite = await title(playlist.artistInfo.current);
    await storeBlobAsObj({
      chunkArray: playlist.files,
      contentType: playlist.contentType,
      title: "_incomplete_" + titleToWrite + "_" + Date.now(),
      bitRate: "",
      radioName: playlist.stationName,
      stationuuid: stationuuid,
    });
  }
  if (urlIdx === undefined) return rv;

  rv.idle = false;
  return rv;
}

/**
 * Custom title setup.
 * Set artist - title style for file write.
 * @param {object} param0 dict
 * @param {string} artist str
 * @param {string} title str
 * @returns {Promise<string>} Promise str
 */
async function title({ artist, title }) {
  const raw = artist.concat(" - ", title);
  const artistTitle = await filterTitle(raw);
  return artistTitle;
}

/**
 * Cleanup string for file write.
 * @param {string} raw str
 * @returns {Promise<string>} Promise str
 */
function filterTitle(raw) {
  return new Promise((resolve, _) => {
    const titleFiltered = raw.replace(
      /[`~!@#$%^&*_|+=?;:'",.<>\{\}\[\]\\\/]/gi,
      ""
    );
    resolve(titleFiltered);
  });
}

/**
 * Should we write blob and blacklist?
 * @param {string} current str title
 * @param {string} titleToWrite str
 * @returns {Promise<object>} Promise dict bool
 */
function changed(current, titleToWrite) {
  return new Promise((resolve, _) => {
    if (current === titleToWrite) resolve({ change: false });
    if (current !== titleToWrite && current !== "") {
      resolve({ change: true });
    }

    resolve({ change: false }); // should never
  });
}

async function incompleteDump(titleToWrite, playlist) {
  if (!playlist.dumpIncomplete)
    recMsg({
      txt: "skip incomplete " + playlist.stationName + " " + titleToWrite,
      level: "success",
    });
  if (playlist.dumpIncomplete) {
    await storeBlobAsObj({
      chunkArray: playlist.files,
      contentType: playlist.contentType,
      title: "_incomplete_" + titleToWrite,
      bitRate: "",
      radioName: playlist.stationName,
      stationuuid: playlist.stationuuid,
    });
  }
}

async function completeDump(titleToWrite, playlist) {
  const isBlacklisted = await writeBlacklist(
    playlist.stationuuid,
    titleToWrite
  );
  if (isBlacklisted)
    recMsg({
      txt: "skip-blacklisted  " + playlist.stationName + " " + titleToWrite,
      level: "success",
    });
  if (!isBlacklisted)
    await storeBlobAsObj({
      chunkArray: playlist.files,
      contentType: playlist.contentType,
      title: titleToWrite,
      bitRate: "",
      radioName: playlist.stationName,
      stationuuid: playlist.stationuuid,
    });

  playlist.files = [];
}
