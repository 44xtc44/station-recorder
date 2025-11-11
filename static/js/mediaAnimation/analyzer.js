// analyzer.js
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
import { analyser, analyserInit } from "./mediaElements.js";

export {
  drawAnalyzerInit,
  RotatingGalaxy,
};


/**
 * Horizontal lines dancing animation.
 * Can be used for splash message as lightning.
 * @param {Object} o.analyser custom analyser
 * @param {Object} o.stdFftSize change analyser output
 * @param {Object} o.canvasId elem id
 * @example
 * drawAnalyzer({ canvasId: "rowCanvas" })
 */
function drawAnalyzerInit(o = {}) {
  const stdFftSize = 2048;
  analyserInit.fftSize = stdFftSize; // node two
  const bufferLength = analyserInit.frequencyBinCount;
  let dataArray = new Uint8Array(bufferLength);
  analyserInit.getByteTimeDomainData(dataArray); // current data

  let canvas = document.getElementById(o.canvasId);
  if (canvas === null || canvas === undefined) return;
  let ctx = canvas.getContext("2d");

  if (o.clearRect) ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = o.lineWidth;
  ctx.strokeStyle = o.strokeStyle;
  ctx.beginPath();
  const sliceWidth = (canvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    let v = dataArray[i] / 128.0;
    let y = (v * canvas.height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  if (dataArray[0] !== 128) ctx.stroke(); // no line if idle

  ctx.closePath();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset context
  dataArray = null;
  canvas = null;
  ctx = null;
}

class RotatingGalaxy {
  /* Analyzer flies around an imaginary center in 2D space AND rotates.

         1.5 * Math.PI (old base radiant thingy, now transform is the choice)
            |
          y | x
    1 -------------- 0   |
            | radius     |
            |            |
         0.5 * Math.PI   . true clock write
  */
  constructor(opt) {
    if (opt.enableDraw === undefined) opt.enableDraw = true; // false use only chords of .update() for piggy-back img use x,y
    this.enableDraw = opt.enableDraw;
    this.canvasId = opt.canvasId;
    this.canvas = document.getElementById(this.canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.speed = opt.speed; // speed can change -> integrate smoothVolume value somehow?
    this.offCenter = opt.offCenter; // radius we fly around something, give it a name
    this.x = this.offCenter; // manipulate x > 0 creates a clean circle rotation around pin point, take skew to press oval
    this.y = 0; // center of circle; will be translated to pin point
    this.pinX = this.canvas.width / 2; // create opt to place somewhere
    this.pinY = this.canvas.height / 2; // translate circle to pin point y
    this.rotate = 0;
  }
  update() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.rotate += this.speed;

    this.ctx.translate(this.pinX, this.pinY);
    // ****************** first rotate ctx; then draw, write 100 times :) ***************
    this.ctx.rotate(this.rotate * (-Math.PI / 180));
    this.drawAnalyzer();
    this.ctx.translate(-this.pinX, -this.pinY);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  drawAnalyzer() {
    let x = 0;
    let barWidth = 5;
    let bufferLength = analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);
    analyser.fftSize = 128;
    analyser.getByteFrequencyData(dataArray);

    this.ctx.lineWidth = 2;
    for (let i = 0; i < bufferLength; i++) {
      // this.ctx.beginPath(); // needed??
      let barHeight = dataArray[i] * 0.28;
      this.ctx.save();
      this.ctx.translate(this.x, this.y);
      this.ctx.rotate((i * Math.PI * 8) / bufferLength);
      this.ctx.fillStyle = "gold";
      this.ctx.fillRect(0, this.canvas.height - barHeight - 60, barWidth, 4);
      let hue = 256 + (i * Math.PI) / 2;
      this.ctx.fillStyle = "hsl(" + hue + ",100%,50%)";
      this.ctx.fillRect(0, 0, barWidth, barHeight);
      x += barWidth;
      this.ctx.restore(); // save, restore needed, we work in an existing transform
    }
    dataArray = null; // mem leak
  }
}
