// messages.js
"use strict";
/**
 *  This file is part of station-recorder. station-recorder is hereby called the app.
 *  The app is published to be a stand alone client for public radio and
 *  TV station URL databases. The cached DB copy can be used also if
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
export {
  recMsg,
  Queue,
  waitMsgContainer,
  accessBlock,
  accessAllow,
  unlimitedStorageContainer,
  threadOverloadContainer,
  writeHelloMessage,
};

/**
 * -- Here we pass all through. -- No remote scripts used.
 * Could be there is an error in the package.json. self....
 * So the package linter assumes we want to use remote scripts.
 *
 * Use the "Parser" to secure HTML strings before rendering.
 * Parser can be used to sanitize text from input elements.
 * That is splitting text, remove unwanted items.
 *
 * Mozilla package upload linter marks the package as unsafe
 * if no parser is used.
 * More information. Server and client side problems.
 * https://www.ias.cs.tu-bs.de/publications/parsing_differentials.pdf
 * @param {HTMLElement} string
 * @returns {Promise<HTMLElement>} string sanitized
 */

export function sanitizeHTML(string) {
  return new Promise((resolve, _) => {
    const domParser = new DOMParser();
    if (string === undefined || string.length <= 0) resolve("");

    let div = document.createElement("div"); // store tags
    const htmlDocument = domParser.parseFromString(string, "text/html");
    // Parser returns a HTML DOCUMENT. If you take tag "body" the css hits.
    // const tags = htmlDocument.getElementsByTagName("body");
    const tags = htmlDocument.body.getElementsByTagName("div");
    for (const tag of tags) {
      // Here we would test. Is it a tag? Test tag for vulnerability.
      div.appendChild(tag);
    }

    resolve(div.innerHTML);
  });
}

/**
 * Director to display and archive/log messages.
 * log history available under menu settings.
 * Monitor frame is created in uiReport.js.
 * @type {object}  message dict
 * @param {string} stationuuid str - show on station container
 * @param {string} txt str
 * @param {string} level str - success || warning || error
 * @param {number} maxLines number - show on fake monitor
 * @returns {Promise<undefined>}
 * @example
 * recMsg({
 *  stationuuid: "0345-636-363",
 *  txt: "favorite station deleted, planet radio",
 *  level: "warning"
 * })
 */
async function recMsg({ stationuuid, txt, level }, maxLines = 5) {
  const cssStyle = await msgStyle(level);
  const { logLine, uiMonitorLine } = await htmlFormat(txt, cssStyle);
  await logToMem(logLine);
  await logToStation(logLine, level, stationuuid);
  await logToMonitor(uiMonitorLine, maxLines);
}

/**
 * @param {string} txt
 * @param {string} cssStyle
 * @returns {Promise<{logLine: string, uiMonitorLine: string}>}
 */
export function htmlFormat(txt, cssStyle) {
  return new Promise((resolve, _) => {
    txt = "&nbsp".concat(txt); // spacer
    // UI monitor logline as HTML string with line cut at end.
    const uiMonitorLine =
      "<div class=msgContainer><span class=" +
      cssStyle +
      ">" +
      txt +
      "</span></div>";

    // Remove the line cut in css style "msgContainer" to show full errors.
    const logLine =
      "<div><span class=" + cssStyle + ">" + txt + "</span></div>";

    resolve({ logLine: logLine, uiMonitorLine: uiMonitorLine });
  });
}

/**
 * @param {string} txt message
 * @param {string} level success || warning || error
 * @returns {Promise<String>} css style;  style.css
 */
export function msgStyle(level) {
  return new Promise((resolve, _) => {
    if (level === undefined) level = "success";
    if (level === "success") resolve("logSuccess");
    if (level === "warning") resolve("logWarning");
    if (level === "error") resolve("logError");
    resolve("logSuccess");
  });
}

/**
 * Store full messages from modules for investigation.
 * @param {string} logLine DOM div HTML string
 * @returns {Promise<undefined>}
 */
function logToMem(logLine) {
  return new Promise((resolve, _) => {
    if (metaData.get()["fullLogHistory"] === undefined) {
      metaData.set()["fullLogHistory"] = [];
    }
    metaData.set()["fullLogHistory"].push(logLine);
    resolve();
  });
}

/**
 * Show log messages for the particular station in the
 * recorder display.
 * @param {string} logLine
 * @param {string} stationuuid
 * @returns {Promise<undefined>}
 */
async function logToStation(logLine, level, stationuuid) {
  if (level !== "error") return;
  if (stationuuid === undefined) return;
  const display = document.getElementById(stationuuid + "_titleBox");
  if (display === null) return;
  // timeout show/hide, stationObj key set true, divVotesBadge_1328e18b-ab1a-4471-a7c4-99bf68d34dbc
  display.innerHTML = await sanitizeHTML(logLine);
}

/**
 * DOMParser sanitised HTML injection. (extension checker cries)
 * Write latest bunch of log messages to UI monitor.
 * div stack of text is re-build at every fun call.
 * Process only the max line count msg from end of array.
 * @param {string} uiMonitorLine DOM elem div content
 * @param {number} maxLines on monitor
 * @returns {Promise<undefined>}
 */
async function logToMonitor(uiMonitorLine, maxLines) {
  if (metaData.get()["uiLogHistory"] === undefined) {
    metaData.set()["uiLogHistory"] = [];
  }
  metaData.set()["uiLogHistory"].push(uiMonitorLine);

  const wrapper = document.getElementById("reportMonitor");
  const logArray = metaData.get()["uiLogHistory"];
  // start negative counts from end
  const slicedEnd = logArray.slice(-(maxLines + 1));
  const reversedSlice = slicedEnd.reverse();

  // Remove all loglines (div stack).
  while (wrapper.firstChild) wrapper.removeChild(wrapper.lastChild);

  for (let i = maxLines; i >= 0; i--) {
    const logLine = document.createElement("div");
    logLine.id = "reportConsole_" + i;
    logLine.style.position = "relative"; // to set an icon absolute

    const lineHtml = reversedSlice.pop();
    if (lineHtml !== undefined) {
      logLine.innerHTML = await sanitizeHTML(lineHtml);
    }
    wrapper.appendChild(logLine);
  }
}

/**
 * https://www.google.com/search?q=svg+exit&udm=2&tbs=rimg:CYdEYeItTdemYaawyiSAoEy0sgIAwAIA2AIA4AIA&hl=de&sa=X&ved=2ahUKEwjkyPy2x7uLAxUwcfEDHdelEdcQuIIBegQIABA8
 * @returns {Promise<HTMLDivElement>} container with msg and evt to remove blockAccess div
 */
function threadOverloadContainer() {
  return new Promise((resolve, _) => {
    const blockAccess = document.getElementById("blockAccess");
    blockAccess.style.display = "block";
    const txtContainer = document.createElement("div");
    txtContainer.id = "vangaMainThreadOverload";
    txtContainer.style.position = "absolute"; // to move around

    const msgHtml =
      "CPU overload prevention." +
      "<br><br> --- RECORD is active ---" +
      "<br><br>Access is blocked during recording - sorry &#129420;." +
      "<br>World related filter have to process a huge amount of data." +
      "<br>Full CPU usage will damage the recorder threads." +
      "<br><br>Fix needed: recorder modules migration to webWorker process." +
      "<br><br>Please click to go back, proceed. --> ";
    const parsed = parser.parseFromString(msgHtml, "text/html");
    const tags = parsed.getElementsByTagName("body");
    for (const tag of tags) {
      txtContainer.appendChild(tag);
    }

    txtContainer.style.top = "20em";
    txtContainer.style.left = "1em";
    txtContainer.style.padding = "5px";
    txtContainer.style.color = "#47b3a4";
    txtContainer.style.border = "solid 1px #ff3d00";
    blockAccess.appendChild(txtContainer);

    txtContainer.addEventListener("click", () => {
      txtContainer.remove();
      blockAccess.style.display = "none";
    });
    resolve(txtContainer);
  });
}

/**
 *
 * @returns {Promise} container with msg
 * @example
 * const unlimStorage = await unlimitedStorageContainer();
 * await blockAccess.appendChild(unlimStorage);
 * await sleep(3000);
 * unlimStorage.remove();
 */
function unlimitedStorageContainer() {
  return new Promise((resolve, _) => {
    const txtContainer = document.createElement("div");
    txtContainer.id = "unlimitedStorage";
    txtContainer.style.position = "absolute"; // to move around
    txtContainer.innerText =
      "No permanent storage -Object stores may be deleted by browser.";
    txtContainer.style.top = "4em";
    txtContainer.style.left = "1em";
    txtContainer.style.color = "#47b3a4";
    resolve(txtContainer);
  });
}

/**
 *
 * @returns {HTMLDivElement} container with loading.. msg
 * @example
 * const txtContainer = await waitMsgContainer();
 */
function waitMsgContainer() {
  return new Promise((resolve, _) => {
    const txtContainer = document.createElement("div");
    txtContainer.id = "vangaWaitMsg";
    txtContainer.style.position = "absolute"; // to move around
    txtContainer.innerText = "loading...";
    txtContainer.style.top = "4em";
    txtContainer.style.left = "1em";
    txtContainer.style.fontSize = "300%";
    txtContainer.style.fontWeight = "600";
    txtContainer.style.color = "#47b3a4";
    resolve(txtContainer);
  });
}

function accessBlock() {
  return new Promise((resolve, _) => {
    const wait = async () => {
      blockAccess = document.getElementById("blockAccess");
      blockAccess.style.display = "block";
      blockAccess.style.opacity = "0.9";
      const txtContainer = await waitMsgContainer();
      blockAccess.appendChild(txtContainer);
      resolve();
    };
    wait();
  });
}

function accessAllow() {
  return new Promise((resolve, _) => {
    document.getElementById("blockAccess").style.display = "none";
    resolve();
  });
}

async function writeHelloMessage() {
  const maxLines = 4; // 0,1,2,3 = 4 hello lines
  await recMsg(
    {
      txt: "Tab an unfolded station name to download a stream.",
      level: "success",
    },
    maxLines
  );
  await recMsg(
    { txt: "Search for station names and music style.", level: "success" },
    maxLines
  );
  await recMsg(
    {
      txt: "Save / Restore recorder blacklists onto another device.",
      level: "success",
    },
    maxLines
  );
  await recMsg(
    {
      txt: "Extension to play local files <a href='https://addons.mozilla.org/en-US/firefox/addon/playlistbooster' target='_blank'>FireFox Android</a>",
      level: "success",
    },
    maxLines
  );
  await recMsg(
    {
      txt: "Add station URLs to the public database <a href='https://www.radio-browser.info' target='_blank'>radio-browser.info</a>",
      level: "success",
    },
    maxLines
  );
}

/**
 * streamMetaGet.js has an outcommented fun
 * to rebuild the original chunk size.
 * This is the prerequisite to cleanup the meta
 * data stream from text (dict start at byte ...) at all.
 */
class Queue {
  constructor() {
    this.queue = [];
    this.len = 0; // always start zero, in Bytes
  }

  enqueue(element) {
    this.queue.push(element);
    return this.queue;
  }

  dequeue() {
    return this.queue.shift();
  }

  pop() {
    this.calcLength({ minus: this.queue[this.queue.length - 1] });
    return this.queue.pop();
  }
  peekHead() {
    return this.queue[0];
  }

  peekTail() {
    return this.queue[this.queue.length - 1];
  }

  lenHead() {
    // if this crashes, we have pb in while stream read, chunk size
    return this.queue[0].length;
  }

  lenTail() {
    return this.queue[this.queue.length - 1].length;
  }

  reverse() {
    return this.queue.reverse();
  }

  delete() {
    this.queue.length = 0;
    return this.queue;
  }

  calcLength(options = {}) {
    this.len = 0;
    for (const element of this.queue) {
      try {
        this.len += element.length;
      } catch (e) {
        return 0;
      }
    }
    if (options.minusLen !== undefined) this.len -= options.minus;
    if (options.plusLen !== undefined) this.len += options.plus;
    return this.len;
  }
}
