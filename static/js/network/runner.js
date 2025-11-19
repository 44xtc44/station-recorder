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
import { m3u8Download, locateTarget } from "../M3U8_HSL/m3u8Downloader.js";

export { record };

/**
 * Record legacy Audio or modern HSL Apple streams.
 * @param {string} stationuuid str
 */
async function record(stationuuid) {
  const station = metaData.get().infoDb[stationuuid];
  const url = await liveServerURL(stationuuid);
  if (url === false) return false;

  if (station.isM3u8) recorderM3U8(url, stationuuid);
  if (!station.isM3u8) recorderAudio(url, stationuuid);
}

/**
 * Return URL if live server.
 * May return a playlist server URL if redirect found.
 * @param {Object<string>} stationuuid str
 * @param {boolean} isM3U8 stream type, bool
 * @returns {String || false} URL str or false
 */
async function liveServerURL(stationuuid) {
  const station = metaData.get().infoDb[stationuuid];
  if (station.isM3u8) {
    const url = await locateTarget(station.url);
    if (url === false) return false;
    return url;
  }
  if (!station.isM3u8) {
    const { url } = await detectStream(stationuuid);
    if (url === false) return false;
    return url;
  }
}

/**
 * TV/Audio live stream from m3u8 files.
 * @param {string} url str
 * @param {string} stationuuid str
 */
function recorderM3U8(url, stationuuid) {
  const station = metaData.get().infoDb[stationuuid];
  if (station.isActive) return;

  metaData.set().infoDb[stationuuid].isActive = true;
  m3u8Download(url);
}

/**
 * Audio live stream.
 * @param {string} url str
 * @param {string} stationuuid str
 */
function recorderAudio(url, stationuuid) {
  const station = metaData.get().infoDb[stationuuid];
  let icyMetaint = true; // force text in stream header
  if (station.isActive) return;

  // start two streams , txt grabber and data after timeout
  if (station.isListening) {
    metaData.set().infoDb[stationuuid].isActive = true;
    streamTxt(url, stationuuid, icyMetaint);
  }
  // if both rec and listening is set, also here
  if (station.isRecording) {
    metaData.set().infoDb[stationuuid].isActive = true;
    setTimeout(() => {
      icyMetaint = false; // ask for the pure stuff
      streamData(url, stationuuid, icyMetaint);
    }, 2000);
  }
}

/**
 * Open text stream of two streams. Metadata grabber.
 */
function streamTxt(stationUrl, stationuuid, icyMetaint) {
  const station = metaData.get().infoDb[stationuuid];

  const res = getStream({
    stationUrl: stationUrl,
    icyMetaint: icyMetaint,
  })
    .then((res) => {
      metaData.set().infoDb[station.stationuuid].bitRate = res.bitRate;
      metaData.set().infoDb[station.stationuuid].chunkSize = res.chunkSize;

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
      recMsg(["fail getStream ::", station.id, e.message]);
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
      recMsg(["fail getStream ::", station.id, e.message]);
      return e;
    });
}
