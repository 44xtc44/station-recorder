// streamDetect.js
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
import { user_agents } from "../constants.js";
import { getRandomIntInclusive } from "../uiHelper.js";

export { detectStream, getStream, resolvePlaylist, urlAlive, providerUrlGet };

/**
 * @param {*} url
 * @returns {Object} input object plus add keys (stream object)
 */
async function getStream(o = {}) {
  const url = o.stationUrl;
  const abortController = new AbortController();
  const abortSignal = abortController.signal;
  abortSignal.addEventListener("abort", () => {});
  const addHeaders = createHeaders({ icyMetaint: o.icyMetaint });

  const fetchOpt = {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: abortSignal,
    headers: addHeaders,
  };

  try {
    // prod fetch
    const response = await fetch(url, fetchOpt); // can be mod url
    if (response.status >= 200 && response.status <= 300) {
      // refac - make object standalone
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
 * Return obj to discover:
 * Stream is alive.
 * Stream is playlist.
 * Playlist content.
 * @param {*} stationuuid
 */
function detectStream(stationuuid) {
  return new Promise((resolve, _) => {
    const stationObj = metaData.get().infoDb[stationuuid];
    const stationName = stationObj.id;
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    abortSignal.addEventListener("abort", () => {});
    let url = stationObj.url;

    let isPlaylist = stationObj.isPlaylist;
    let isM3u8 = stationObj.isM3u8; // work on breaking ts (hsl) protocol
    let isReady = false;
    let contentType = "audio/x-mpegurl";

    /**
     * Run all async to get await, means resolve the promise at end of async block once!
     */
    const waitFetch = async () => {
      const fetchOpt = {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: abortSignal,
      };

      // Response must be aborted, not set boolean or none! Kill external fetch.
      const response = await fetch(url, fetchOpt).catch(() => {
        return "NETWORK_ERROR";
      });
      if (response !== "NETWORK_ERROR") {
        contentType = response.headers.get("Content-Type");
        // async in a promise can also be use to return before next
        // statement / expression, must resolve also.
        // No return in a simple promise. Caught to the bitter end.
        if (contentType === null) {
          recMsg(["fail:: no header content-type", stationName]);
          resolve({ url: false, text: false });
          return;
        }
        // Have a look at in blacklist button "station details".
        try {
          // defective header prevention
          const headersTxt = JSON.stringify([...response.headers]);
          metaData.set().infoDb[stationuuid].headers = headersTxt;
        } catch (e) {
          console.log(
            "err json store header in closure->",
            response.headers,
            e
          );
        }
      }

      if (response.status >= 200 && response.status <= 300) {
        // ok, filter out playlist later
        if (isPlaylist) {
          isReady = true;
        }
        if (!isPlaylist) {
          isReady = true;
        }
      }
      if (response.status < 200 || response.status > 300) {
        // false Server response
        isReady = false;
        console.error("detectStream->::SERVER_ERROR", url);
        resolve({ url: false, text: false });
      }

      // Prepare return - abort, then resolve

      // if pl, return url from playlist and content of playlist file
      if (isPlaylist && isReady) {
        let urlObj = await resolvePlaylist(stationObj, response);
        resolve({ url: urlObj.url, text: urlObj.text });
      }

      if (response === "NETWORK_ERROR") {
        isReady = false;
        console.error("detectStream->::NETWORK_ERROR", url);
        recMsg(["stream detect :: NETWORK_ERROR", url])
        resolve({ url: false, text: false });
      }
      // if no pl, return url object; can contain text
      if (!isPlaylist && isReady) {
        resolve({ url: url, text: "" });
      }
      // filter
      if (contentType.includes("text/html")) {
        recMsg(["fail ::URL_IS_TEXT_NOT_STREAM", stationName]);
        resolve({ url: false, text: false });
      }
      if (isM3u8) {
        recMsg(["fail ::M3U8_CANT_RECORD", stationName]);
        resolve({ url: false, text: false });
      }

      abortController.abort();
      try {
        await response.text();
      } catch (e) {}
    };
    waitFetch();
  });
}

/**
 * URL alive checker.
 * Filter out wrong configured, redirects and zombie server.
 * @param {string} url
 * @param {string} checkContenType i.e radio-browser.info DB server
 * @returns {boolean} true or false
 */
function urlAlive(url, checkContenType = true) {
  return new Promise(async (resolve, _) => {
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

    const fetchOpt = {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: signal,
    };

    const response = await fetch(url, fetchOpt).catch((e) => {
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
      console.error(
        "status code not in range->code, url",
        response.status,
        url
      );
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
      recMsg(["fail ::IS_TEXT_NOT_STREAM"]);
      isServing = false;
      abortController.abort();
    }

    resolve(isServing);
  });
}

function createHeaders(o = {}) {
  const addHeaders = new Headers();
  const agentOrange = getRandomIntInclusive(0, user_agents.length - 1);
  addHeaders.append("User-Agent", user_agents[agentOrange]);
  addHeaders.append("pragma", "no-cache");
  // Upgrade-Insecure-Requests
  addHeaders.append("Upgrade-Insecure-Requests", "0");
  addHeaders.append("cache-control", "no-cache");
  if (o.icyMetaint === true) addHeaders.append("Icy-MetaData", "1");
  return addHeaders;
}

/**
 * Return dictionary with original URL, 
 * or first station URL from playlist, plus whole list for UI choice.
 * Playlist has URLs of current streaming stations.
 * Wrong configured server have .m3u or .pls at end of endpoint 
 * but send mp3, aac, ogg.
 * 
 * @param {*} stationObj
 * @param {*} response
 * @returns {Object} { url: radio_url, text: false } text is playlist text
 */
async function resolvePlaylist(stationObj, response) {
  // radio play action needs resolved playlist URL, else silence
  const isM3U = stationObj.isM3U; // audio/x-mpegurl
  const isPLS = stationObj.isPLS; // application/pls+xml audio/x-scpls
  const isAshx = stationObj.isAshx; // M$ IIS server, audio/x-mpegurl
  const isM3u8 = stationObj.isM3u8;
  const radio_url = stationObj.radio_url;
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
    return { url: radio_url, text: false }; // ret original url
  }

  const file = await response.text(); // test binary TELEJEREZ is mp3 -----???----- DB entry no m3u8 ------------------------------
  const linesArray = file.split("\n");
  if (isM3u8) {
    return { url: false, text: linesArray };
  }
  let found = false;
  for (let idx = 0; idx < linesArray.length; idx++) {
    if (isM3U || isAshx) {
      // line array of URLs
      const urlLine = linesArray[idx];
      if (urlLine !== undefined) {
        const protocol = urlLine.trim().substring(0, 4).toLowerCase();
        if (protocol === "http") {
          found = true;
          recMsg(["all station URLs in log: ", linesArray]);
          return { url: urlLine, text: linesArray };
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
          found = true;
          return { url: plsUrl, text: linesArray };
        }
      }
    }
  }
  if (!found) return { url: false, text: false };
}

/**
 * Help to provide a link in interactive log monitor.
 * @param {string} streamUrl
 * @returns {Promise} string provider part of URL
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
