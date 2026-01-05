// streamDetect.js
"use strict";
const debug = true;
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

import { metaData } from "../central.js";
import { user_agents } from "../constants.js";
import { getRandomIntInclusive } from "../uiHelper.js";
import { recMsg } from "./messages.js";

export { detectStream, getStream, providerUrlGet, resolvePlaylist, urlAlive };

/**
 * (A) Player, resolve server playlists for audio element.
 *  "detectStream"
 *
 * (B) Recorder has a stream detector and grabber.
 *  "detectStream" - resolve server playlists for recorder,
 *  "getStream" - pass response +add-info to recorder loop.
 *
 * (C) Custom URL saver, UI settings and for database update.
 *  el Cheapo dead endpoint detector.
 *  "urlAlive"
 *
 * (1) Playlists resolver
 *  "resolvePlaylist" - called by "detectStream"
 * (2) Provide a link to UI in case audio element fails (FireFox problem).
 *  "providerUrlGet"
 */

/**
 * Recorder stream grabber.
 * @param {string} url
 * @param {number} icyMetaint station should send meta information 0 || 1
 * @returns {Promise<{
 *  abortController: AbortController,
 *  abortSignal: AbortSignal,
 *  response: Response,
 *  streamReader: Function,
 *  headers: Object,
 *  contentType: string,
 *  chunkSize: string,
 *  bitRate: string
 * }>}
 */
async function getStream({ url, icyMetaint }) {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;
  abortSignal.addEventListener("abort", () => {});
  const addHeaders = await createHeaders({ icyMetaint: icyMetaint });

  const fetchArgs = {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: abortSignal,
    headers: addHeaders,
  };

  try {
    // prod fetch
    const response = await fetch(url, fetchArgs); // can be mod url
    if (response.status >= 200 && response.status <= 300) {
      const responseObj = {
        abortController: abortController,
        abortSignal: abortSignal,
        response: response, // for abortController in caller
        streamReader: response.body.getReader(),
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get("Content-Type"),
        chunkSize: response.headers.get("icy-Metaint"),
        bitRate: response.headers.get("icy-br"), // fail: null
      };

      return responseObj;
    }
  } catch (e) {
    console.log("catch getStream->", e);
    return e;
  }
}

/**
 * Player/Recorder. "Just the detector".
 * If server playlist, resolve "first" station URL available.
 * Kill the connection at all cost.
 * @param {string} stationuuid
 * @returns {Promise<{ url: string | false, text: string | false}>}
 */
async function detectStream(stationuuid) {
  console.log("-> streamdetect Begin ");
  const station = metaData.get().infoDb[stationuuid];
  const stationName = station.id;
  const abortController = new AbortController();
  const abortSignal = abortController.signal;
  abortSignal.addEventListener("abort", () => {});

  let url = station.url; // may be playlist URL later
  let isPlaylist = station.isPlaylist;
  let isM3u8 = station.isM3u8; // work on recording .ts (HLS) protocol

  const fetchArgs = {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: abortSignal,
  };

  // Response must be aborted, kill fetch.
  const response = await fetch(url, fetchArgs).catch(async (e) => {
    console.error("-> detectStream::NETWORK_ERROR ", e);
    await recMsg({
      stationuuid: stationuuid,
      txt: "NETWORK_ERROR " + e + " " + url,
      level: "error",
    });
    await abortConnection(abortController, "NETWORK_ERROR " + e);
    return { url: false, text: false };
  });

  if (response === "NETWORK_ERROR") return { url: false, text: false };
  if (response.status < 200 || response.status > 300) {
    await recMsg({
      stationuuid: stationuuid,
      txt: "SERVER_ERROR " + url,
      level: "error",
    });
    await abortConnection(abortController, "SERVER_ERROR " + url);
    return { url: false, text: false };
  }

  const contentType = await contentTypeGet({
    station: station,
    response: response,
  });
  console.log("-> streamdetect contentType ", contentType);

  if (!contentType) {
    await abortConnection(abortController, "No header content-type " + url);
    return { url: false, text: false };
  }

  await archiveHeader(station, response);

  // Wrong configured server shows HTML page, not a stream.
  if (contentType.includes("text/html")) {
    await recMsg({
      stationuuid: stationuuid,
      txt: "URL_IS_TEXT_NOT_STREAM " + stationName,
      level: "error",
    });
    await abortConnection(abortController, "URL_IS_TEXT_NOT_STREAM ");
    return { url: false, text: false };
  }

  if (isM3u8) {
    await recMsg({
      stationuuid: stationuuid,
      txt: "M3U8_CANT_RECORD " + stationName,
      level: "error",
    });
    await abortConnection(abortController, "M3U8_CANT_RECORD ");
    return { url: false, text: false };
  }

  if (isPlaylist) {
    const playlist = await resolvePlaylist(station, response);
    await abortConnection(abortController, "playlist ");
    return { url: playlist.url, text: playlist.text };
  }

  await abortConnection(abortController, "simple stream ");
  return { url: url, text: false };
}

/**
 * @type {Object} param0
 * @param {Object<JSON>} station JSON object
 * @param {Object<Response>} response Response
 * @returns {Promise<string | false>} contentType
 */
async function contentTypeGet({ station, response }) {
  let contentType = undefined;
  try {
    contentType = response.headers.get("Content-Type");
  } catch (e) {}
  if (contentType === null || contentType === undefined) {
    await recMsg({
      stationuuid: station.id,
      txt: "No header content-type " + station.name,
      level: "error",
    });
    return false;
  }
  return contentType;
}

/**
 * Have a look at in blacklist button "station details".
 * @param {Object<JSON>} station JSON
 * @param {Response} response Response
 * @returns {Promise<undefined>}
 */
function archiveHeader(station, response) {
  return new Promise((resolve, _) => {
    try {
      const headersTxt = JSON.stringify([...response.headers]);
      metaData.set().infoDb[station.id].headers = headersTxt;
    } catch (e) {
      metaData.set().infoDb[station.id].headers = [{ headersTxt: false }];
      console.error(
        "-> detectStreamjson defective header ",
        response.headers,
        e
      );
    }
    resolve();
  });
}

/**
 * Abort a connection regardless if it is a stream or not.
 * @param {AbortController} abortController AbortController
 * @param {string} debugMsg string
 * @returns {Promise<undefined>}
 */
async function abortConnection(abortController, debugMsg) {
  return new Promise((resolve, _) => {
    try {
      abortController.abort();
    } catch (e) {}
    if (debug) console.log("-> abortConnection ", debugMsg);
    resolve();
  });
}

/**
 * Try to write shorter.
 * Express server for npm package use should use it.
 * URL alive checker. DB updater uses it.
 * Filter out wrong configured, redirects and zombie server.
 * @param {string} url string
 * @param {boolean} checkContenType i.e radio-browser.info DB server
 * @returns {Promise<boolean>} true | false
 */
async function urlAlive(url, checkContenType = true) {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;
  // Break fetch if "abort" is called.
  abortSignal.addEventListener("abort", () => {});
  // Break fetch if timeout hits.
  const timeoutSignal = AbortSignal.timeout(10_000);
  // Combine both.
  const signal = AbortSignal.any([timeoutSignal, abortSignal]);

  let contentType = "audio/x-mpegurl"; // arbitrary, may help or not
  let isServing = false;

  const fetchArgs = {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: signal,
  };

  const response = await fetch(url, fetchArgs).catch((e) => {
    return "NETWORK_ERROR";
  });

  if (response !== "NETWORK_ERROR") {
    contentType = response.headers.get("Content-Type");
  }

  if (response.status >= 200 && response.status <= 300) {
    isServing = true;
    abortController.abort();
  }

  if (
    (response.status < 200 && response.status > 300) ||
    response.status === undefined
  ) {
    console.error("status code not in range->code, url", response.status, url);
    isServing = false;
    abortController.abort();
  }

  if (response === "NETWORK_ERROR") {
    console.error("urlAlive->::NETWORK_ERROR", url);
    isServing = false;
    abortController.abort();
  }
  if (
    checkContenType &&
    contentType !== null &&
    contentType.includes("text/html")
  ) {
    await recMsg({
      stationuuid: stationuuid,
      txt: "stream detect, IS_TEXT_NOT_STREAM" + stationName,
      level: "error",
    });
    isServing = false;
    abortController.abort();
  }

  return isServing;
}

/**
 * @type {Object} param0
 * @param {boolean} icyMetaint should send meta.info
 * @returns {Promise<Object>} Headers dict
 */
async function createHeaders({ icyMetaint }) {
  const addHeaders = new Headers();
  const agentOrange = getRandomIntInclusive(0, user_agents.length - 1);
  addHeaders.append("User-Agent", user_agents[agentOrange]);
  addHeaders.append("pragma", "no-cache");
  // Upgrade-Insecure-Requests
  addHeaders.append("Upgrade-Insecure-Requests", "0");
  addHeaders.append("cache-control", "no-cache");
  if (icyMetaint === true) addHeaders.append("Icy-MetaData", "1");
  return addHeaders;
}

/**
 * Return dictionary with original URL,
 * or first station URL from playlist, plus whole list for UI choice.
 * Playlist has URLs of current streaming stations.
 * Wrong configured server have .m3u or .pls at end of endpoint
 * but send mp3, aac, ogg.
 *
 * @param {JSON} station JSON
 * @param {Response} response Response
 * @returns {Promise<{url: string | false, text: string | false}>} text is playlist content
 */
async function resolvePlaylist(station, response) {
  // radio play action needs resolved playlist URL, else silence
  const stationuuid = station.stationuuid;
  const isM3U = station.isM3U; // audio/x-mpegurl
  const isPLS = station.isPLS; // application/pls+xml audio/x-scpls
  const isAshx = station.isAshx; // M$ IIS server, audio/x-mpegurl
  const isM3u8 = station.isM3u8;
  const contentType = response.headers.get("Content-Type");

  // Filter for standard contentType. Means no playlist server.
  if (
    contentType == "audio/aacp" ||
    contentType == "application/aacp" ||
    contentType == "audio/aac" ||
    contentType == "audio/ogg" ||
    contentType == "application/ogg" ||
    contentType == "audio/mpeg"
  ) {
    return { url: station.url, text: false }; // ret original url
  }

  const file = await response.text(); // test binary "TELEJEREZ" is mp3 -----???----- DB entry no m3u8 ------------------------------
  const linesArray = file.split("\n");

  if (isM3u8) {
    return { url: false, text: linesArray };
  }
  // sunshine live - Vocal Trance
  // https://sunsl.streamabc.net/sunsl-vocaltrance-mp3-192-5826863?sABC=6956rnq4%230%23o64ssn0936s26r8rnnpq75oqoq44n36s%23fgernz.fhafuvar-yvir.qr&aw_0_1st.playerid=stream.sunshine-live.de&amsparams=playerid:stream.sunshine-live.de;skey:1767303892"
  // [Fix] semicolon found in .m3u member URL string
  for (let idx = 0; idx < linesArray.length; idx++) {
    if (isM3U || isAshx) {
      // line array of URLs
      const urlLine = linesArray[idx];
      if (urlLine !== undefined) {
        const protocol = urlLine.trim().substring(0, 4).toLowerCase();
        if (protocol === "http") {
          return { url: urlLine.replace(";", "."), text: linesArray };
        }
      }
    }
    // EBM-Radio DEU error - minor prio
    if (isPLS) {
      // line array row starts with File1=http....
      const plsUrl = linesArray[idx].split("File1=")[1];
      if (plsUrl !== undefined) {
        const protocol = plsUrl.trim().substring(0, 4).toLowerCase();
        if (protocol === "http") {
          return { url: plsUrl, text: linesArray };
        }
      }
    }
  }
  if (!found) return { url: false, text: false };
}

/**
 * Help to provide a link in interactive UI log monitor.
 * Shoutcast streams have a web site where you can switch
 * to other stream qualities, watch titles played or login
 * as admin of the stream from a remote location.
 * @param {string} streamUrl string
 * @returns {Promise<string>} string provider part of URL
 */
function providerUrlGet(streamUrl) {
  return new Promise((resolve, _) => {
    const shoutcastProtocol = streamUrl.split("//")[0];
    const shoutcastAddress = streamUrl.split("//")[1];
    const shoutcastHome = shoutcastAddress.split("/")[0];
    const shoutcastProvider = shoutcastProtocol.concat("//", shoutcastHome);

    resolve(shoutcastProvider);
  });
}
