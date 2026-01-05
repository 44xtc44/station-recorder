// zipCompressBoss.mjs
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
 * Call worker, kill worker style.
 * Send path to IDB store, wait for worker send
 * Blob as arayBuffer in .postMessage and convert back to blob.
 * https://stackoverflow.com/questions/15341912/how-to-go-from-blob-to-arraybuffer
 * https://stackoverflow.com/questions/16071211/using-transferable-objects-from-a-web-worker
 * readableStream
 * https://advancedweb.hu/how-to-transfer-binary-data-efficiently-across-worker-threads-in-nodejs/
 * 
 */
