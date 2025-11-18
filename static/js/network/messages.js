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
import { runArrowAnimation } from "../mediaAnimation/arrowAnimation.js";
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

const parser = new DOMParser(); // sanitize html, else mozilla linter cries

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

/**
 * Monitor messages are string arrays. Mix of HTML and text.
 * Description plus variables and additional descriptions.
 * log history available under menu settings.
 * Monitor frame is created in uiReport.js.
 * @param {string[]} msgList
 * @param {number} maxLines to show on fake monitor
 */
function recMsg(msgList, maxLines = 5) {
  return new Promise(async (resolve, _) => {
    const firstString = [...msgList[0]];
    firstString.splice(0, 0, "&nbsp"); // put at 0, del 0 values from there
    msgList[0] = firstString.join("");

    // Join strings and style message type.
    const mix = msgList.join(",");
    let spanClass = "spanLogMessage"; // style.css
    if (mix.includes("::")) spanClass = "spanLogWarning";
    if (mix.includes("stop all recorder")) spanClass = "spanLogWrite";
    if (mix.includes("write DB")) spanClass = "spanLogWrite";

    // UI monitor logline as HTML string.
    const uiMonitorLine =
      "<div class=msgContainer><span class=" +
      spanClass +
      ">" +
      mix +
      "</span></div>";

    // Remove the line cut css style "msgContainer" for full errors.
    const logLine =
      "<div><span class=" + spanClass + ">" + mix + "</span></div>";

    await logToMem(logLine);
    await logToMonitor(uiMonitorLine, maxLines);

    resolve();
  });
}

/**
 * Store full messages from modules for investigation.
 * @param {string} logLine DOM elem div content
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
 * Sanitised HTML injection. (else extension checker cries)
 * Write latest bunch of log messages to UI monitor.
 * div stack of text is re-build at every fun call.
 *  Process only maxLine count msg from end of array.
 * @param {string} uiMonitorLine DOM elem div content
 * @param {number} maxLines on monitor
 */
function logToMonitor(uiMonitorLine, maxLines) {
  //
  return new Promise((resolve, _) => {
    if (metaData.get()["uiLogHistory"] === undefined) {
      metaData.set()["uiLogHistory"] = [];
    }
    metaData.set()["uiLogHistory"].push(uiMonitorLine);

    const wrapper = document.getElementById("reportMonitor");

    const logArray = metaData.get()["uiLogHistory"];
    // start negative counts from end
    const slicedEnd = logArray.slice(-(maxLines + 1));
    const reversedSlice = slicedEnd.reverse();

    // Remove all loglines (divs).
    while (wrapper.firstChild) wrapper.removeChild(wrapper.lastChild);

    for (let i = maxLines; i >= 0; i--) {
      const logLine = document.createElement("div");
      logLine.id = "reportConsole_" + i;
      logLine.style.position = "relative"; // to set an icon absolute

      const lineHtml = reversedSlice.pop();

      if (lineHtml !== undefined) {
        const htmlDocument = parser.parseFromString(lineHtml, "text/html");
        // parser returns a HTML DOCUMENT, if you take tag "body" the css hits
        // const tags = htmlDocument.getElementsByTagName("body");
        const tags = htmlDocument.body.getElementsByTagName("div");
        for (const tag of tags) {
          logLine.appendChild(tag);
        }
      }
      wrapper.appendChild(logLine);
    }
    resolve();
  });
}

/**
 * https://www.google.com/search?q=svg+exit&udm=2&tbs=rimg:CYdEYeItTdemYaawyiSAoEy0sgIAwAIA2AIA4AIA&hl=de&sa=X&ved=2ahUKEwjkyPy2x7uLAxUwcfEDHdelEdcQuIIBegQIABA8
 * @returns {Promise} container with msg and evt to remove blockAccess
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
    txtContainer.id = "vangauUlimitedStorage";
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

function writeHelloMessage() {
  return new Promise((resolve, _) => {
    const maxLines = 4; // 0,1,2,3 = 4 hello lines
    recMsg(["Tab an unfolded station name to download a stream."], maxLines);
    recMsg(["Search for station names and music style."], maxLines);
    recMsg(["Save / Restore recorder blacklists onto another device."], maxLines);
    // 
    recMsg(
      [
        "Extension to play local files <a href='https://addons.mozilla.org/en-US/firefox/addon/playlistbooster' target='_blank'>FireFox Android</a>",
      ],
      maxLines
    );
    recMsg(
      [
        "Add station URLs to the public database <a href='https://www.radio-browser.info' target='_blank'>radio-browser.info</a>",
      ],
      maxLines
    );

    runArrowAnimation();
    resolve();
  });
}
