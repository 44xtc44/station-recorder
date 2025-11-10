// runner.js
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

import { recMsg } from "./messages.js";
import { metaData } from "../central.js";
import { detectStream, getStream } from "./streamDetect.js";
import { consumeStream } from "./streamDataGet.js";
import { consumeMetadata } from "./streamMetaGet.js";

export { runMetaAndRecord };

async function runMetaAndRecord(stationuuid) {
  const stationObj = metaData.get().infoDb[stationuuid];
  let stationUrl = stationObj.url; // Can be a resolved playlist URL.
  let icyMetaint = true; // get text in stream

  // Check server response.
  const urlObj = await detectStream(stationuuid);
  if (urlObj.url === false) return;
  // A resolved playlist has another URL.
  if (urlObj.url !== stationUrl) {
    stationUrl = urlObj.url;
  }

  // prevent multiple fetch accident
  if (!stationObj.isActive) {
    // start two streams , txt grabber and data after timeout
    if (stationObj.isListening) {
      metaData.set().infoDb[stationuuid].isActive = true;
      streamTxt(stationUrl, stationuuid, icyMetaint);
    }

    // if both rec and listening is set, also here
    if (stationObj.isRecording) {
      metaData.set().infoDb[stationuuid].isActive = true;
      setTimeout(() => {
        icyMetaint = false; // ask for the pure stuff
        streamData(stationUrl, stationuuid, icyMetaint);
      }, 2000);
    }
  }
}

/**
 * Open text stream of two streams. Metadata grabber.
 */
function streamTxt(stationUrl, stationuuid, icyMetaint) {
  const stationObj = metaData.get().infoDb[stationuuid];

  const res = getStream({
    stationUrl: stationUrl,
    icyMetaint: icyMetaint,
  })
    .then((res) => {
      metaData.set().infoDb[stationObj.stationuuid].bitRate = res.bitRate;
      metaData.set().infoDb[stationObj.stationuuid].chunkSize = res.chunkSize;

      consumeMetadata({
        stationuuid: stationuuid,
        chunkSize: res.chunkSize,
        bitRate: res.bitRate,
        response: res.response,
        contentType: res.contentType,
        streamReader: res.streamReader,
        abortSignal: res.abortSignal,
        abortController: res.abortController,
      }).catch(() => {
        // message: "The operation was aborted. "  name: "AbortError"
      });
    })
    .catch((e) => {
      recMsg(["fail getStream ::", stationObj.id, e.message]);
      return e;
    });
}

/**
 * Open data stream of two streams. Data grabber.
 */
function streamData(stationUrl, stationuuid, icyMetaint) {
  const res = getStream({
    stationUrl: stationUrl,
    icyMetaint: icyMetaint,
  })
    .then((res) => {
      consumeStream({
        stationuuid: stationuuid,
        contentType: res.contentType,
        headers: res.headers,
        response: res.response,
        streamReader: res.streamReader,
        abortSignal: res.abortSignal,
        abortController: res.abortController,
      }).catch(() => {
        // message: "The operation was aborted. "  name: "AbortError"
      });
    })
    .catch((e) => {
      recMsg(["fail getStream ::", stationObj.id, e.message]);
      return e;
    });
}
