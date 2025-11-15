// streamMetaGet.js
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

import { switchRecorderState } from "../recordPlay/recordRadioStream.js";
import { resolveFileExt } from "../fileStorage/fileStorage.js";
import { recMsg, Queue } from "./messages.js";
import { metaData } from "../central.js";

export { consumeMetadata };

async function consumeMetadata(o = {}) {
  // https://stackoverflow.com/questions/33702838/how-to-append-bytes-multi-bytes-and-buffer-to-arraybuffer-in-javascript
  // https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
  // https://stackoverflow.com/questions/76356710/create-a-blob-from-a-web-stream-in-node-js
  // StreamTitle='';
  // AdCreativeId='bf8ac07132516bd5edc4ccda6f882e96';AdTitle='In-Stream Audio';Advertiser='ubereats.com';';

  /**
  The client adds an HTTP header to the request indicating that it is able to process in-band metadata: Icy-Metadata: 1.
  The server may then splice the metadata into the stream. If it does so, it has to tell the client the frequency with wich metadata is added. 
  That's also done via an HTTP header: icy-metaint: 16000. 16000 is a safe bet. All clients I've seen are OK with that. 
  For higher precision with known clients (for example when relaying a stream) you can try to use 1000.
  The metadata then gets just cut into the stream every icy-metaint bytes.
  The metadata block starts with a single byte indicating how long the metadata is. This byte must be multiplied with 16 for the actual size. 
  Then the metadata follows.
  The metadata itself may have several fields, but the only crucial one is StreamTitle. 
  I have yet to see a client that supports anything else. (copied from somewhere, rene)
  Audio element:
  https://stackoverflow.com/questions/67116204/possibility-to-record-playback-of-browser-audio-element-using-javascript
     */
  const stationuuid = o.stationuuid;
  const stationObj = metaData.get().infoDb[stationuuid];
  const stationName = stationObj.name;

  const streamReader = o.streamReader;
  let targetLen = o.chunkSize;
  if (targetLen === undefined || targetLen === null) targetLen = 16000;
  const abortController = o.abortController;
  const utf8Decoder = new TextDecoder("utf-8");
  let txt = "";

  const descriptor = "StreamTitle="; // StreamTitle='foo-plays bar';\u000
  const advertiser = "Advertiser=";

  const streamQ = new Queue(); // own q removes backpressure from underlying realtime q
  // const metaQ = new Queue(); // original chunk size from radio station, find text msg
  let icyIdx = undefined; // can be a counter, from promise resolved (returned)

  recMsg(["txt ", stationName]);
  
  while (true) {
    // div element may be removed and new created in favorite store. Will trigger an exception!
    const uiTitleDisplay = document.getElementById(stationuuid.concat("_titleBox"));
    // if (uiTitleDisplay !== null) uiTitleDisplay.style.display = "inline-block";
    let nextChunk =  await streamReader.read(targetLen);
    if (nextChunk.done) {
      recMsg(["txt abort ::, connect rejected", stationName]);
      switchRecorderState(stationuuid); // just in streamMetaGet else call again
      break; // radio killed our connection
    }
    let chunk = nextChunk.value;

    // streamQ.enqueue(chunk); // collect to create one o.metaQ,
    // const streamQlen = streamQ.calcLength();
    // if (streamQlen > targetLen) {
    // Write a chunk from producer with original size, precision ahead.
    // pb producer is splicing the metadata in first call at chunk 1 byte 1, then somewhere into the stream.
    // This stream suffers from digital noise every few seconds. Logic says -> two streams. icy reader, icy recorder.
    /*       const oneObj = {
        // metaQ: metaQ,
        // streamQ: streamQ,
        // streamQlen: streamQlen,
        targetLen: targetLen,
      }; */
    /*       
      icyIdx = await oneIcyArrayMeta(oneObj);
      // console.log("done-icy->", streamQ.calcLength(), icyIdx);
      // perhaps we can find a way to cut the digital noise out of the stream
      // if you track shoutcast info on a station they have mostly double connections than user (same ip)
      // txt = utf8Decoder.decode(chunk);  // icyIdx
      txt = utf8Decoder.decode(metaQ.queue[icyIdx - 1]);
 */
    txt = utf8Decoder.decode(chunk);
    // read text [REFAC] fun
    if (txt.includes(descriptor) && !txt.includes(advertiser)) {
      const raw = txt.split(descriptor)[1].split(";")[0];
      const medium = raw.slice(1, raw.length - 1); // del ''
      // https://stackoverflow.com/questions/4374822/remove-all-special-characters-with-regexp
      // well done
      const title = medium.replace(
        /[`~!@#$%^&*_|+=?;:'",.<>\{\}\[\]\\\/]/gi,
        ""
      ); // Same filter is also in blacklist writer. A mess if trying put it in constans.js.
      metaData.set().infoDb[stationuuid].textMsg = title; // streamDataGet.js reads it

      if (o.bitRate === null) o.bitRate = "";
      if (uiTitleDisplay !== null)
        uiTitleDisplay.innerText = title.concat(
          " [",
          o.bitRate,
          "kB ",
          resolveFileExt(o.contentType),
          "]"
        );
    }
    txt = null;
    chunk = null;
    nextChunk = null;

    if (!metaData.get().infoDb[stationuuid].isListening) {
      try {
        uiTitleDisplay.innerText = "---";
      } catch (e) {}
      abortController.abort();
      recMsg(["exit txt ", stationName]);
      break;
    }
  }
}

async function oneIcyArrayMeta(o = {}) {
  // o = options; two wrapper to get the result back sequential
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer
  // https://stackoverflow.com/questions/51452398/how-to-use-arraybuffers-with-dataviews-in-javascript
  let q = o.streamQ; // direct hit

  return new Promise((resolve, _) => {
    /**
     * Merge multiple array buffer uint8array 'views' into one buffer view.
     * Slice, not Splice, the desired bytes into a continous chunk and store it in a list.
     * This work is done to investigate possibilities of future removal of text msg from stream.
     * Use one stream, goal.
     * Currently the msg stream is noisy and not acceptable.
     */
    // Get the total length of all uint8arrays (views on ^^contigous^^ buffer areas).
    let qlength = 0; // streamQ
    q.queue.forEach((item) => {
      qlength += item.length;
    });
    // Create a new array with total length and merge all source arrays (internet chunks) of streamQ.
    let mergedArray = new Uint8Array(qlength);
    let offset = 0;
    q.queue.forEach((item) => {
      mergedArray.set(item, offset);
      offset += item.length;
    });
    // We can not splice. uint8array is a ^^view^^ and therefore read only.
    // We can destroy the view -> let view = []; but the buffer is phys. mem.
    // View is two sided and needs a buffer.
    // A new view needs 'let foo = new Arraybuffer(42)' allocates new (raw) memory.
    // View data size (i.e uint8 uint32 ...) behaves like a list with an overlay of byte size (8,16,32,64).
    // Onw row can contain more or less data, because of data size.
    // We can split the view (on parts of mem), like a list, but not the phys. mem.
    const icyChunk = mergedArray.slice(0, o.targetLen);
    // const prodChunk = mergedArray.slice(0, o.targetLen);  // build this noisy thingy
    const qChunk = mergedArray.slice(o.targetLen, mergedArray.length);
    o.metaQ.enqueue(icyChunk); // currently deleted after reading by decoder
    q.delete(); // destroy streamQ 'list' data structure
    q.enqueue(qChunk); // put stream remnand, not fit in metaQ, begin of following stream parts collection
    mergedArray = []; // can not set 0 len, get error on getter only. mergedArray is a 'view' data structure.
    resolve(o.metaQ.queue.length); // index (-1) for decoder or else
  });
}
