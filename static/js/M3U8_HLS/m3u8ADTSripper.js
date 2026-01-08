// m3u8ADTSripper.js
"use strict";
const debug = false;
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

export { scan, toBin, detachID3, removeADTS };

/**
 * Search and remove ADTS header. 72 bit long.
 *
 * Extract id3 header data and store it.
 * Remove all id3 header.
 * Dump-> unshift extracted header onto chunk array.
 *
 */

/**
 * https://wiki.multimedia.cx/index.php/ADTS
 * live example:
 * 11111111 11111001 01011000 01000000 00100011 00100000 00000000  00000001 01010110
 *
 * AAAAAAAA AAAABCCD EEFFFFGH HHIJKLMM MMMMMMMM MMMOOOOO OOOOOOPP (QQQQQQQQ QQQQQQQQ)
 * Header consists of 7 or 9 bytes (without or with CRC).
 * Letter 	Length (bits) 	Description
 * A 	12 	Syncword, all bits must be set to 1.
 * B 	1 	MPEG Version, set to 0 for MPEG-4 and 1 for MPEG-2.
 * C 	2 	Layer, always set to 0.
 * D 	1 	Protection absence, set to 1 if there is no CRC and 0 if there is CRC.
 * E 	2 	Profile, the MPEG-4 Audio Object Type minus 1.
 * F 	4 	MPEG-4 Sampling Frequency Index (15 is forbidden).
 * G 	1 	Private bit, guaranteed never to be used by MPEG, set to 0 when encoding, ignore when decoding.
 * H 	3 	MPEG-4 Channel Configuration (in the case of 0, the channel configuration is sent via an inband PCE (Program Config Element)).
 * I 	1 	Originality, set to 1 to signal originality of the audio and 0 otherwise.
 * J 	1 	Home, set to 1 to signal home usage of the audio and 0 otherwise.
 * K 	1 	Copyright ID bit, the next bit of a centrally registered copyright identifier. This is transmitted by sliding over the bit-string in LSB-first order and putting the current bit value in this field and wrapping to start if reached end (circular buffer).
 * L 	1 	Copyright ID start, signals that this frame's Copyright ID bit is the first one by setting 1 and 0 otherwise.
 * M 	13 	Frame length, length of the ADTS frame including headers and CRC check.
 * O 	11 	Buffer fullness, states the bit-reservoir per frame.
 *
 * max_bit_reservoir = minimum_decoder_input_size - mean_bits_per_RDB; // for CBR
 *
 * // bit reservoir state/available bits (≥0 and <max_bit_reservoir); for the i-th frame.
 * bit_reservoir_state[i] = (int)(bit_reservoir_state[i - 1] + mean_framelength - framelength[i]);
 *
 * // NCC is the number of channels.
 * adts_buffer_fullness = bit_reservoir_state[i] / (NCC * 32);
 *
 * However, a special value of 0x7FF denotes a variable bitrate, for which buffer fullness isn't applicable.
 * P 	2 	Number of AAC frames (RDBs (Raw Data Blocks)) in ADTS frame minus 1. For maximum compatibility always use one AAC frame per ADTS frame.
 * Q 	16 	CRC check (as of ISO/IEC 11172-3, subclause 2.4.3.1), if Protection absent is 0.
 */

function scan(chunk) {
  return new Promise((resolve, _) => {
    const utf8Decoder = new TextDecoder("utf-8");
    const txt = utf8Decoder.decode(chunk);
    console.log("->m3u8ADTSripper->scan", txt);
    resolve();
  });
}

/**
 * https://stackoverflow.com/questions/69345835/how-to-calculate-the-id3v2-tag-size-from-mp3-file-correctly
 * https://shaka-player-demo.appspot.com/docs/api/lib_util_id3_utils.js.html
 * https://wiki.multimedia.cx/index.php?title=ADTS#Buffer_Fullness
 * https://shaka-player-demo.appspot.com/docs/api/lib_transmuxer_aac_transmuxer.js.html
 * @param {Uint8Array} chunk Uint8Array
 */
async function toBin(chunk) {
  const ID3Data = shaka.util.Id3Utils.getID3Data(chunk, 0);
  // Returns "Array" of ID3 frames found in all of the ID3 tags
  // "key" PRIV, TIT2, TPE1; "data" stream protocol, title, artist name, so far
  // ID3Frames.lenght is 0 if no tags found
  const ID3Frames = shaka.util.Id3Utils.getID3Frames(ID3Data);

  for await (const [idx, byte] of chunk.entries()) {
    if (idx >= 20) break;
    const showBit = byte.toString(2).padStart(8, "0"); // bin. targetLen, str
    const charCode = byte.toString().charCodeAt(0);
    const ascii = String.fromCharCode(charCode);
  }
}

async function detachID3(chunk) {
  return new Promise((resolve, _) => {
    const ID3Data = shaka.util.Id3Utils.getID3Data(chunk, 0);
    // Returns "Array" of ID3 frames found in all of the ID3 tags
    // "key" PRIV, TIT2, TPE1; "data" stream protocol, title, artist name, so far
    // ID3Frames.lenght is 0 if no tags found

    // const ID3Frames = shaka.util.Id3Utils.getID3Frames(ID3Data);

    const rawData = chunk.slice(ID3Data.length);

    resolve({ ID3Data: ID3Data, rawData: rawData });
  });
}

/**
 * Test bin, hex or mix of both to detect Syncword and rip header.
 * byte.toString(16,).padStart(2, "0") sometimes shows <empty string>
 * Stick with bin.
 *
 * Search for "111111111111" word, twelve. Hex fff. ON SELECTED BYTE.
 * uint8array idx ptr -> found Syncword at byte, to byte frame end
 * read bit 31-43 for length, might be endian
 * @param {*} chunk
 */
async function removeADTS(chunk) {
  const stream = {
    bytes: chunk, // array of Uint8Arrays of bytes that makes the chunk
    bins: await binArray(chunk), // same as bytes, but array of binary strings
    frameHeaders: {}, // all headers run through during process; debugging
    syncIdxs: [], // start indexes of found sync words to extract data from frames
    rawData: [], // concat. array of Uint8Arrays of extracted media data of chunk
    syncIdxsNUM: 0,
    rawDataLenChk: 0,
  };

  const { ID3Data, rawData } = await detachID3(stream.bytes);
  await nextSync(stream);
  await rawDataGet(stream);
  stream.syncIdxsNUM = stream.syncIdxs.length;
  const rawArray = new Uint8Array(rawData); // stream.rawData
  stream.rawDataLenChk = stream.rawData.length;
  console.log(
    "->removeADTS byte, rawData chk ",
    stream.bytes.length,
    stream.rawData.length,
    stream.rawDataLenChk,
    ID3Data,
    stream.syncIdxs
  );

  return rawArray;
  // return stream.bytes;
}

async function rawDataGet({ bytes, syncIdxs, rawData }) {
  const chunkEnd = bytes.length; // last sync frame may overlap next chunk

  for await (const [idx, frame] of syncIdxs.entries()) {
    let ADTShead = 9; // header bytes length if CRC, else 7 bytes
    if (frame.crc === 1) ADTShead = 7;

    if (idx === 0) {
      // chunk begins with ID3
      rawData.push(...bytes.slice(0, frame.start));
    }
    if (idx === syncIdxs.length - 1) {
      // last sync word to end of chunk
      // rawData.push(...bytes.slice(frame.start + ADTShead, chunkEnd));
      rawData.push(...bytes.slice(frame.start, chunkEnd));
      break;
    }
    if (syncIdxs[idx + 1] !== undefined) {
      // to the next sync word
      // rawData.push(...bytes.slice(frame.start + ADTShead, next));
      rawData.push(...bytes.slice(frame.start, syncIdxs[idx + 1].start));
    }
  }
}

/* async function rawDataGet({ bytes, syncIdxs, rawData }) {
  const chunkEnd = bytes.length; // last sync frame may overlap next chunk

  for await (const [idx, frame] of syncIdxs.entries()) {
    let ADTShead = 9; // header bytes length if CRC, else 7 bytes
    if (frame.crc === 1) {
      ADTShead = 7;
    }
    if (idx === 0) {
      // chunk begins with ID3
      rawData.push(...bytes.slice(0, frame.start));
    }
    if (idx === syncIdxs.length - 1) {
      // last sync word to end of chunk
      // rawData.push(...bytes.slice(frame.start + ADTShead, chunkEnd));
      rawData.push(...bytes.slice(frame.start, chunkEnd));
      break;
    }
    if (syncIdxs[idx + 1] !== undefined) {
      // to the next sync word
      // rawData.push(...bytes.slice(frame.start + ADTShead, next));
      rawData.push(...bytes.slice(frame.start, syncIdxs[idx + 1].start));
    }
  }
}
 */
/* async function rawData({ bytes, syncIdxs, rawData }) {
  const ADTShead = 72; // bytes length
  for await (const [idx, frame] of syncIdxs.entries()) {
    if (idx === 0) {
      // chunk begin with ID3 + raw
      rawData.push(...bytes.slice(0, frame.start));
    }
    const rawStart = frame.start + ADTShead;
    const rawEnd = frame.start + frame.fLen;
    rawData.push(...bytes.slice(rawStart, rawEnd));
  }
} */

/**
 * ADTS sync is unreliable.
 * Length data wrong, layer bits are not always 00.
 * --> change strategy. Concat all chunks of one .m3u8 file.
 *     ---> sync timer read out #EXT bla 4,2335453653 to get a BLOCK
 *     ---> create a buffer/queue of 2sec, check pre and now valid
 *          to get aac frames and or discard false positive ADTS header
 *          check how many URLs make a BLOCK
 * @param {*} param0
 */
async function nextSync({ bins, syncIdxs, frameHeaders }) {
  // ADTS header | 1111 1111 | 1111 X00X | where X can be
  // either 0 or 1
  // Layer bits (position 14 and 15) in header should be always 0 for ADTS
  // More info https://wiki.multimedia.cx/index.php?title=ADTS
  // AAC https://hydrogenaudio.org/index.php/topic,95756.0.html
  const word = "11111111";
  const nibble = "1111";
  const layerBits = "00"; // "00"
  // const syncWord = word + nibble;

  for await (const [idx, str] of bins.entries()) {
    if (str !== word) continue;

    if (str === word) {
      if (
        bins[idx + 1] !== undefined &&
        bins[idx + 1].startsWith(nibble) &&
        bins[idx + 1].slice(-3, -1) === layerBits // .slice(-3, -1)
      ) {
        // console.log("->removeADTS->for", "hit", str, strTest, idx);
        const header = await dumpFrameHeader(idx, frameHeaders, bins);
        syncIdxs.push(header);
      }
      if (bins[idx + 1] === undefined) {
        if (debug) console.error("->idx undef");
      }
    }
  }
}

/**
 * Dev, check correct bits are collected.
 * Dump header of each ADTS frame.
 * Calculation of length.
 * - M - often suffers from frame length errors. So M.dec is useless.
 * ->sync overlap atIdx, len, lenBins  9380 8063 14213 m3u8ADTSripper.js:286:13
 * ->sync overlap atIdx, len, lenBins  14119 247 14213
 * The data grabber will read to far, file defective.
 * @param {*} atIdx
 * @param {*} headerStart
 * @param {*} bins
 * @returns
 */
async function dumpFrameHeader(atIdx, frameHeaders, bins) {
  const headerBytes = 9; // 72 bits if CRC present (Q filled), else 56 (cutter reads D)
  const lenBins = bins.length; // last sync frame may overlap next chunk
  const head = {};
  head[atIdx] = {
    AtIdx: atIdx,
    A: { bin: "", dec: 0 }, // 12 Syncword, all bits must be set to 1.
    B: { bin: "", dec: 0 }, // 1 	MPEG Version, set to 0 for MPEG-4 and 1 for MPEG-2.
    C: { bin: "", dec: 0 }, // 2 	Layer, always set to 0.
    D: { bin: "", dec: 0 }, // 1 	Protection absence, set to 1 if there is no CRC and 0 if there is CRC.
    E: { bin: "", dec: 0 }, // 2 	Profile, the MPEG-4 Audio Object Type minus 1.
    F: { bin: "", dec: 0 }, // 4 	MPEG-4 Sampling Frequency Index (15 is forbidden).
    G: { bin: "", dec: 0 }, // 1 	Private bit, guaranteed never to be used by MPEG, set to 0 when encoding, ignore when decoding.
    H: { bin: "", dec: 0 }, // 3 	MPEG-4 Channel Configuration (in the case of 0, the channel configuration is sent via an inband PCE (Program Config Element)).
    I: { bin: "", dec: 0 }, // 1 	Originality, set to 1 to signal originality of the audio and 0 otherwise.
    J: { bin: "", dec: 0 }, // 1 	Home, set to 1 to signal home usage of the audio and 0 otherwise.
    K: { bin: "", dec: 0 }, // 1 	Copyright ID bit, the next bit of a centrally registered copyright identifier. This is transmitted by sliding over the bit-string in LSB-first order and putting the current bit value in this field and wrapping to start if reached end (circular buffer).
    L: { bin: "", dec: 0 }, // 1 	Copyright ID start, signals that this frame's Copyright ID bit is the first one by setting 1 and 0 otherwise.
    M: { bin: "", dec: 0 }, // 13 Frame length, length of the ADTS frame including headers and CRC check.
    O: { bin: "", dec: 0 }, // 11 Buffer fullness, states the bit-reservoir per frame.
    P: { bin: "", dec: 0 }, // 2 	Number of AAC frames
    Q: { bin: "", dec: 0 }, // 16 CRC check
  };
  const frameHeader = bins.slice(atIdx, atIdx + headerBytes).join(""); // bit str "111010..."

  const A = (head[atIdx].A.bin = frameHeader.slice(0, 12));
  head[atIdx].A.dec = parseInt(A, 2);
  const B = (head[atIdx].B.bin = frameHeader.slice(12, 13));
  head[atIdx].B.dec = parseInt(B, 2);
  const C = (head[atIdx].C.bin = frameHeader.slice(13, 15));
  head[atIdx].C.dec = parseInt(C, 2);
  const D = (head[atIdx].D.bin = frameHeader.slice(15, 16));
  head[atIdx].D.dec = parseInt(D, 2);
  const E = (head[atIdx].E.bin = frameHeader.slice(16, 18));
  head[atIdx].E.dec = parseInt(E, 2);
  const F = (head[atIdx].F.bin = frameHeader.slice(18, 22));
  head[atIdx].F.dec = parseInt(F, 2);
  const G = (head[atIdx].G.bin = frameHeader.slice(22, 23));
  head[atIdx].G.dec = parseInt(G, 2);
  const H = (head[atIdx].H.bin = frameHeader.slice(23, 26));
  head[atIdx].H.dec = parseInt(H, 2);
  const I = (head[atIdx].I.bin = frameHeader.slice(26, 27));
  head[atIdx].I.dec = parseInt(I, 2);
  const J = (head[atIdx].J.bin = frameHeader.slice(27, 28));
  head[atIdx].J.dec = parseInt(J, 2);
  const K = (head[atIdx].K.bin = frameHeader.slice(28, 29));
  head[atIdx].K.dec = parseInt(K, 2);
  const L = (head[atIdx].L.bin = frameHeader.slice(29, 30));
  head[atIdx].L.dec = parseInt(L, 2);
  const M = (head[atIdx].M.bin = frameHeader.slice(30, 43));
  head[atIdx].M.dec = parseInt(M, 2);
  const O = (head[atIdx].O.bin = frameHeader.slice(43, 54));
  head[atIdx].O.dec = parseInt(O, 2);
  const P = (head[atIdx].P.bin = frameHeader.slice(54, 56));
  head[atIdx].P.dec = parseInt(P, 2);
  /**
   * Again!
   * CRC present if letter D is set to dec. 0, else this 2 byte is aac start.
   * Frame cutter must read D.
   */
  const Q = (head[atIdx].Q.bin = frameHeader.slice(56, 72));
  head[atIdx].Q.dec = parseInt(Q, 2);
  /* 
  if (atIdx + head[atIdx].M.dec > lenBins) {
    // alarm console.error("->sync overlap atIdx, len, lenBins ", atIdx, head[atIdx].M.dec, lenBins)
    head[atIdx].M.dec = -1;
  } */

  Object.assign(frameHeaders, head);
  return {
    s: atIdx,
    crc: head[atIdx].D.dec,
    fLen: head[atIdx].M.dec,
    cLen: bins.length,
  };
}

/**
 *
 * @param {*} chunk
 * @returns
 */
async function binArray(chunk) {
  const array = [];
  for await (const byte of chunk) {
    array.push(byte.toString(2).padStart(8, "0")); // bin. targetLen, str
  }
  return array;
}
