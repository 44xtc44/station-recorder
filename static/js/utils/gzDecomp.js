// gzDecomp.js
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

export { gzDecomp };
/**
 * Input is uint8array of gz compressed data.
 * Output is a Blob.
 * (input fetch snippets:
 * const streamReader = response.body.getReader(),
 * const nextChunk = await streamReader.read();)
 * Blob as binary data contained in an ArrayBuffer.
 * Currently new DecompressionStream("gzip") can only
 * process one file. Their repo.
 * https://github.com/whatwg/compression/blob/main/explainer.md
 * Examples to handle string files gz.
 * https://evanhahn.com/javascript-compression-streams-api-with-strings/
 * @param {Uint8Array} chunkArray
 * @returns {Blob} binary data in arraybuffer (of no file type)
 */
async function gzDecomp(chunkArray) {
  // to arrayBuffer
  let dlArrayBuffer = await new Blob(chunkArray).arrayBuffer();
  // to stream
  let gzStream = new Blob([dlArrayBuffer]).stream();
  // decompressed stream
  let decompressedStream = gzStream.pipeThrough(
    new DecompressionStream("gzip")
  );

  // Read bytes from stream. Can use For, as it is not endless.
  let decompChunks = [];
  for await (const chunk of decompressedStream) {
    decompChunks.push(chunk);
  }

  let gzBlob = await new Blob(decompChunks).arrayBuffer();

  // mem leak
  gzStream = null;
  dlArrayBuffer = null;
  decompressedStream = null;
  decompChunks.length = 0;

  return gzBlob;
}
