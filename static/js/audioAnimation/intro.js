// intro.js
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
import { waitMsgContainer } from "../network/messages.js";
import { drawAnalyzerInit } from "./analyzer.js";

export { runIntroAnimation };

let introAanimationFrameCount = 0;
const canvas = document.getElementById("lightningCanvas");
let canvasWidth = 0;

/**
 * Register the animation correctly to get rid of it later.
 * Counter must be global. Killer must be in a setTimeout.
 * Else end up with zombie threads. Not that I don't like zombies.
 * AnimationFrame is not well documented at all.
 */
function runLightningAnimation() {
  return new Promise((resolve, _) => {
    introAanimationFrameCount = requestAnimationFrame(animationIntro);
    resolve();
  });
}

function introContainer() {
  return new Promise((resolve, _) => {
    const introWrap = document.createElement("div");
    introWrap.id = "introWrap";
    introWrap.classList.add("introWrap");
    introWrap.style.position = "relative"; // reminder set all absolute
    resolve(introWrap);
  });
}

function feedIntro() {
  return new Promise((resolve, _) => {
    const audio = document.getElementById("audioWithControls");
    audio.src = "js/assets/wanga-sound.mp3"; // power lightnings (analyzer.js)
    resolve();
  });
}

function stopIntro() {
  return new Promise((resolve, _) => {
    cancelAnimationFrame(introAanimationFrameCount);
    const audio = document.getElementById("audioWithControls");
    audio.src = ""; // shows a warning in console, need a silence.mp3 from Audacity
    resolve();
  });
}

/**
 * Lightnings show (three times) overwrite the previous before
 * clearRectangle.
 *
 * --- NO ANALYZER OUTPUT IF AUDIO ELEMENT HAS VOLUME ZERO ---
 * Output threshold (curve) is max. at volume level 100.
 */
function animationIntro() {
  // console.log("animationIntro->");
  canvasWidth += 0.2;
  if (canvasWidth >= 12) canvasWidth = 10;
  canvas.style.width = canvasWidth + "em"; // expand to -> 10em

  drawAnalyzerInit({
    canvasId: "lightningCanvas",
    lineWidth: "5",
    strokeStyle: "rgb(123, 104, 238)",
    clearRect: true,
  });
  drawAnalyzerInit({
    canvasId: "lightningCanvas",
    lineWidth: "3",
    strokeStyle: "rgb(255, 192, 203)",
  });
  drawAnalyzerInit({
    canvasId: "lightningCanvas",
    lineWidth: "1",
    strokeStyle: "#fff",
  });
  introAanimationFrameCount = requestAnimationFrame(animationIntro);
}

function introBgImage() {
  return new Promise((resolve, _) => {
    const div = document.createElement("div");
    const img = document.createElement("img");
    img.id = "introImgBg";
    img.style.position = "absolute";
    img.src = "./images/splash-msg.png";
    img.style.width = "480px";
    img.style.height = "530px";
    div.appendChild(img);
    resolve(div);
  });
}

/**
 * Move the lightning around the page.
 * May rotate it.
 * @returns {HTMLObjectElement} div canvas_wrapper
 */
function setupLightning() {
  return new Promise((resolve, _) => {
    // Position canvas lightning (canvas anchor div)
    const canvasWrapper = document.createElement("div");
    canvasWrapper.id = "canvas_wrapper";
    canvasWrapper.style.position = "absolute";
    canvasWrapper.style.left = "8.0em";
    canvasWrapper.style.top = "19em";
    canvasWrapper.style.width = "20px"; // canvas anchor, color to position
    canvasWrapper.style.height = "20px";
    canvasWrapper.style.backgroundColor = "";
    canvasWrapper.style.zIndex = "1";

    // canvas lightning init "size" to grow

    canvas.id = "lightningCanvas";
    canvas.style.backgroundColor = "";
    canvas.style.position = "absolute";
    canvas.style.height = "100px";
    canvas.style.width = canvasWidth + "em"; // init widht, to ->10em
    canvas.style.display = "block";
    canvas.style.backgroundColor = "transparent";

    canvasWrapper.appendChild(canvas);
    resolve(canvasWrapper);
  });
}
/**
 * @param {*} o
 * @returns
 */
function runIntroAnimation(o = {}) {
  return new Promise(async (resolve, _) => {
    const parent = document.getElementById(o.parentId);

    const introWrap = await introContainer();
    const imgBg = await introBgImage();
    const lightning = await setupLightning();

    await parent.appendChild(introWrap);
    await introWrap.appendChild(imgBg);
    await introWrap.appendChild(lightning);

    await runLightningAnimation(); // start requestAnimationFrame
    await feedIntro(); // sound to animate the Lightning canvas; sound is 5s
    await sleep(3000); // max run, DB loader worker runs separate process
    await stopIntro(); // stop requestAnimationFrame and change audio src
    await introWrap.remove();
    const showLoadMsg = await waitMsgContainer();
    await parent.appendChild(showLoadMsg);

    resolve();
  });
}
