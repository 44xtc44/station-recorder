// uiHelper.js
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
import { recMsg } from "./network/messages.js";
import { metaData } from "./central.js";
export {
  sleep,
  appendDiv,
  getRandomIntInclusive,
  filterString,
  shuffleArray,
  setUploadEvtListener,
};

function filterString(str) {
  return str.replace(/[`~!@#$%^&*_|+=?;:'",.<>\{\}\[\]\\\/]/gi, ""); // blacklist writer, meta dl, central div.id
}

/**
 * Block thread for ms
 * @param {number} ms
 * @returns after timeout
 * @example
 *  const wait = async () => {
 *    await sleep(5000)
 *    console.log("sleep->")
 *  }
 *  wait();
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stack div and use it as a list.
 * @param {{*}} opt dictionary
 * @example appendDiv({ parentId: 'div0ne', childId: 'c1', innerText: 'low', elemClass: 'logger' });
 */
function appendDiv(opt) {
  const parent = document.getElementById(opt.parentId);
  const div = document.createElement("div");
  div.id = opt.childId;
  div.classList.add(opt.elemClass);
  div.innerText = opt.innerText;
  parent.appendChild(div);
}

// return a random integer
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
  return new Promise((resolve, _) => {
    for (let idx = array.length - 1; idx > 0; idx--) {
      let j = Math.floor(Math.random() * (idx + 1));
      [array[idx], array[j]] = [array[j], array[idx]]; // swap two elem positions in array at once
    }
    resolve(array);
  });
}

/**
 * Report incident Android mulit-download skips files.
 * @returns
 */
function setUploadEvtListener() {
  return new Promise((resolve, _) => {
    metaData.set()["upload_dev"] = 1;
    const imgArrow = document.getElementById("imgArrow");
    const menuUploadDev = document.getElementById("liUpload");
    imgArrow.addEventListener("click", () => {
      let count = metaData.get()["upload_dev"];
      if (count === 7) {
        menuUploadDev.style.display = "inline-block";
        recMsg([":: upload menu available"]);
      }
      count += 1;
      metaData.set()["upload_dev"] = count;
    });
    resolve();
  });
}
