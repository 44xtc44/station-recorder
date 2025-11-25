// streamDataGet.js
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

// https://stackoverflow.com/questions/7255719/
// downloading-binary-data-using-xmlhttprequest-without-overridemimetype^
// read stream as blob
// https://reference.codeproject.com/dom/xmlhttprequest/sending_and_receiving_binary_data
// https://stackoverflow.com/questions/58088831/arraybuffer-has-no-data-when-using-the-incoming-data
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream
// https://clicktorelease.com/blog/loading-sounds-faster-using-html5-web-audio-api/
// https://gist.github.com/niko/2a1d7b2d109ebe7f7ca2f860c3505ef0   metadata within the stream from an icecast server
// file write no URL https://stackoverflow.com/questions/6076047/create-a-download-link-from-a-blob-url

import { recMsg } from "./messages.js";
import { metaData } from "../central.js";
import { writeBlacklist } from "../fileStorage/blacklist.js";
import { storeBlobAsObj } from "../fileStorage/fileStorage.js";

export { consumeStream };

/**
 * Get stream to store.
 * Only first and last title can be "_incomplete".
 * Other titles can be "blacklisted".
 * Dump at:
 *
 * count 0 means first time a text change happened or
 *   if also "dumpIncomplete" is active dump the stream
 *   ,at the end of the loop, if recorder reads .isRecording = false
 *   assuming that there is no title to write,
 *   the file gets "no_title" and a (UNIX) timestamp
 *
 * count 1 is the first prefix "_incomplete" title or
 *   a text that stays forever in display,
 *   dump at the end of the loop if recorder reads .isRecording = false
 *
 * count > 1 means first prefix "_incomplete" was skipped (default)
 *   and the title is complete to dump; next title appeared in display
 *     the last title will be dumped only with prefix "_incomplete"
 *     if "dumpIncomplete" is active.
 * @param {Object} param0 kwargs
 * @param {string} stationuuid str
 * @param {string} contentType str
 * @param {streamReader} streamReader streamReader
 */
async function consumeStream({ stationuuid, contentType, streamReader }) {
  const station = metaData.get().infoDb[stationuuid];
  const stationName = station.name;
  let bitRate = station.bitRate;
  if (bitRate === null) bitRate = "";
  let targetLen = station.chunkSize;
  if (targetLen === undefined || targetLen === null) targetLen = 16000;

  let chunkArray = [];
  let count = 0;
  const noTitleMsg = "no_title";
  let titleToWrite = noTitleMsg;

  if (stationuuid === undefined) {
    stationuuid = "sr-custom-" + stationName; // need a guuid generator here
  }
  const dumpIncomplete = metaData.get().infoDb[stationuuid].dumpIncomplete;

  while (true) {
    let nextChunk = await streamReader.read();
    if (nextChunk.done) {
      recMsg(["stream abort ::, connect rejected", stationName]);
      break; // radio killed our connection
    }

    let chunk = nextChunk.value;
    chunkArray.push(chunk);
    const kwargs = {
      chunkArray: chunkArray,
      contentType: contentType,
      title: titleToWrite,
      bitRate: bitRate,
      radioName: stationName,
      stationuuid: stationuuid,
    };
    const titleInDisplay = metaData.get().infoDb[stationuuid].textMsg;

    if (titleToWrite !== titleInDisplay && titleInDisplay !== "") {
      if (titleToWrite !== noTitleMsg && count > 1) {
        const isBlacklisted = await writeBlacklist(stationuuid, titleToWrite);
        if (isBlacklisted)
          recMsg(["skip-blacklisted  ", stationName, titleToWrite]);
        if (!isBlacklisted) await storeBlobAsObj(kwargs);
        chunkArray = [];
      }
      if (count === 1) {
        if (!dumpIncomplete)
          recMsg(["skip incomplete ", stationName, titleToWrite]);
        if (dumpIncomplete) {
          kwargs.title = "_incomplete_" + titleToWrite;
          await storeBlobAsObj(kwargs);
        }
      }

      titleToWrite = titleInDisplay;
      count += 1;
    }

    chunk = null;
    nextChunk = null;

    if (!metaData.get().infoDb[stationuuid].isRecording) {
      recMsg(["exit stream ", stationName]);
      if (dumpIncomplete) {
        kwargs.title = "_incomplete_" + titleToWrite + "_" + Date.now();
        await storeBlobAsObj(kwargs);
      }

      chunkArray = [];
      break;
    }
  }
}
