// zipCompressWorker.mjs
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

/**
 * WHAT IS https://github.com/mrananyan/ZipperJS
 * @param {*} e 
 */

/**
 * .postMessage transfer option
 * var arrayBuffer;
 * var fileReader = new FileReader();
 * fileReader.onload = function(event) {
 *     arrayBuffer = event.target.result;
 * };
 * fileReader.readAsArrayBuffer(blob);
 * Test run
  const uInt8Array = new Uint8Array(1024 * 1024 * 8).map((i) => i); // map?
  console.log(uInt8Array.byteLength); // 8388608
  self.postMessage({transfer: uInt8Array.buffer,[uInt8Array.buffer]}
  self.onmessage ..... read e.data.transfer and conver to blob
 * 
 */
// Had an issue with imports here, fixed by ren modules to .mjs.
self.onmessage = function (e) {
    console.log("-> netWorker received message", e.data);
    // Transfer e got an error.
    // Uncaught DataCloneError: Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': MessageEvent object could not be cloned.
    const obj = JSON.parse(JSON.stringify(e));
    self.postMessage({ txt: "netWorker ", e: obj });
  };
  self.onerror = (e) => {
    const obj = JSON.parse(JSON.stringify(e));
    self.postMessage(obj);
    self.close();
  };
  
