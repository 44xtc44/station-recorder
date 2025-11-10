// directAudio.js
"use strict";

import { getStream } from "./streamDetect.js";

/**
 * Want to buffer incoming stream in a uint(X)buffer and 
 * feed the audio element from this/those buffer(s)
 * Check
 * https://stackoverflow.com/questions/24221738/buffering-audio-with-the-web-audio-api
 * https://community.openai.com/t/playing-audio-in-js-sent-from-realtime-api/970917/7
 * https://stackoverflow.com/questions/73417403/real-time-recording-and-playing-audio-as-buffer
 * https://www.geeksforgeeks.org/html/how-to-load-an-audio-buffer-play-it-using-the-audio-tag/
 */

/*
at first fetch on remote url, feed into audio element
then fetch on new Response with uint8array and header
feeded by a yield
https://stackoverflow.com/questions/65767261/stream-an-audio-file-into-the-html-audio-element-via-ajax-php-request-with-blob

const response = new Response(myData, {
  status: 200,
  statusText: 'OK',
  headers: {
    'Content-Type': 'application/json'
  }
}

make a blob and convert it to an arrayBuffer 
https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer
feed the buffer into the audio element buffer
why
the blob can not be extended, but the arrayBuffer can 
problem
url stream response can not be red by audio element, 
it wants a blob
the arrayBuffer must be flushed to not get a memory leak
solve
ringbuffer
find event of audio element which triggers buffer empty

-> FF no handle! https://developer.mozilla.org/en-US/docs/Web/API/MediaSource

how to get it in the audio buffer (plus convert to blob to get content-type,
convert back to audio buffer and load it into audio.ctx)
https://developer.mozilla.org/en-US/docs/Web/API/Response/arrayBuffer

stream it (use the buffer) https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement
header to array buffer https://stackoverflow.com/questions/63022524/how-do-i-convert-response-and-request-headers-to-arraybuffers-in-javascript
https://stackoverflow.com/questions/64781995/how-to-get-mime-type-of-an-array-buffer-object
https://github.com/sindresorhus/file-type/blob/main/core.js

first big bucket array buffer
cut 32k to make a blob
convert blob back to array buffer to have mime-type
feed audio buffer (decode?), check audio buffer empty
https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode can use audio.ctx
https://stackoverflow.com/questions/47274120/how-to-play-audio-stream-chunks-recorded-with-webrtc
And an AudioBuffer has Float32Arrays. You need to convert your Int16Array to a Float32Array before assigning it to an AudioBuffer. Probably good enough to divide everything by 32768.

https://stackoverflow.com/questions/51843518/mediasource-vs-mediastream-in-javascript
https://stackoverflow.com/questions/51523512/receiving-a-video-parts-and-append-them-to-a-mediasource-using-javascript
https://stackoverflow.com/questions/45143308/using-mediasource-for-video-with-mediarecord
https://stackoverflow.com/questions/61980161/live-streaming-video-by-connecting-arraybuffers-client-side
https://stackoverflow.com/questions/50333767/html5-video-streaming-video-with-blob-urls
check dl files
https://stackoverflow.com/questions/45919172/firefox-web-extension-read-local-file-last-downloaded-file

!!! https://joshuatz.com/posts/2020/appending-videos-in-javascript-with-mediasource-buffers/ !!!!!
https://stackoverflow.com/questions/48468375/javascript-append-multiple-buffer-to-sourcebuffer-and-play-them-as-a-single-vide
https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/mode
https://udn.realityripple.com/docs/Web/API/SourceBuffer
*/
import { metaData } from "../central.js";

export { getDirectAudio_file, runFeedMedia };

let intervalId = 0; // module global to end it elsewhere
let stationuuid = "";
/* 
const x = new Uint8Array([21, 31]);
console.log(x[1]); // 31let arrayBuffer = await new Blob(chunkArray).arrayBuffer();
    let blob = new Blob([arrayBuffer], { type: contentType });
let response = new Blob();
const audioFeed = URL.createObjectURL(response);
const audio = document.getElementById("audioWithControls");
audio.src = audioFeed() 
*/

function runFeedMedia(id) {
  stationuuid = id;
  // intervalId = setInterval(readMediaBuffer, 5000);
  
  // create a synthetic blob (simulated sound file) to keep the audio elem open
  // fill array with either 128 (silence) or random 1-256
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/Uint8Array
}

/**
 *
 * @param {boolean} o.test
 */
function readMediaBuffer(o = {}) {
  if (o.test === true) stationuuid = o.stationuuid;

  let mediaBucket = metaData.get().infoDb[stationuuid].mediaBucket;
  // console.log("buffer", mediaBucket.streamChunks);
  const concatUint8 = concatenate(mediaBucket.streamChunks);
  console.log("concat8->", concatUint8);
}

function getDirectAudio_file(relativePathToFile) {
  relativePathToFile = "loaderFile.json";
  return new Promise((resolve, _) => {
    const wait = async () => {
      const response = await fetch(relativePathToFile).catch((e) => {
        console.error("fetchJson->", relativePathToFile, e);
        return false;
      });
      if (response.ok) {
        const mrJson = response.json();
        resolve(true);
      } else {
        resolve(false);
      }
    };
    wait();
  });
}

async function _getDirectAudio_file() {
  fetch("./loaderFile.json", {
    // "https://jsonplaceholder.typicode.com/todos"
    // Adding Get request
    // method: "GET",
    // Setting headers
    /*         headers: {
           'Content-Type': 'application/octet-stream',
        }, */
    // Setting response type to arraybuffer
    // responseType: "arraybuffer"
  })
    .catch((e) => {
      console.error("fetchJson->", e);
      return false;
    })

    // Handling the received binary data
    .then((response) => {
      if (response.ok) {
        const mrJson = response.json();
        debugger;
        return response.arrayBuffer();
      }
      console.log("Binary data send Successfully");
    })
    .then((arraybuffer) => console.log("Binary data received Successfully"))

    // Handling the error
    .catch((err) => {
      console.log("Found error:", err);
    });
}

async function __getDirectAudio_file() {
  const folder = "./";
  const loader = "test.mp3";
  const relativePathToFile = folder + loader;
  const response = await fetch(relativePathToFile, {
    // Adding Get request
    method: "GET",
    // Setting headers
    headers: {
      "Content-Type": "application/octet-stream",
    },
    // Setting response type to arraybuffer
    responseType: "arraybuffer",
  }).catch((e) => {
    console.error("getDirectAudio_file->", relativePathToFile, e);
    return false;
  });
  if (response.ok) {
    const reader = response; // await response.body.getReader();
    const file = reader.arrayBuffer(); // await reader.read();
    debugger;
  } else {
  }
}

async function getDirectAudio_1() {
  const audio = document.getElementById("audioWithControls");
  let respWrapper = null; // assign to createObjectURL as pointer

  /*
  // test at first with file from disk; blob and arraybuffer and blob to arraybuffer
  while (truen) {
    let response = null; // kill everything left in mem
    response = new Response([], {});
    respWrapper = response
  
    response.arrayBuffer = [];
    response.status = 200;
    response.statusText = "OK";
    response.headers = { "Content-Type": "application/json" };

  }

  */

  // Uncaught (in promise) TypeError: URL.createObjectURL: Argument 1 could not be converted to any of: Blob, MediaSource.
  const url = window.URL.createObjectURL(response.response);
  // Uncaught (in promise) DOMException: The media resource indicated by the src attribute or assigned media provider object was not suitable.
  // const url = response.response.url;
  debugger;
  audio.type = "audio/mpeg";
  audio.src = url;
  audio.play();
}

async function getDirectAudio() {
  const audio = document.getElementById("audioWithControls");

  const response = await getStream({
    stationUrl: "https://server26265.streamplus.de/stream.mp3",
    icyMetaint: false,
  });
  // Uncaught (in promise) TypeError: URL.createObjectURL: Argument 1 could not be converted to any of: Blob, MediaSource.
  const url = window.URL.createObjectURL(response.response);
  // Uncaught (in promise) DOMException: The media resource indicated by the src attribute or assigned media provider object was not suitable.
  // const url = response.response.url;
  debugger;
  audio.type = "audio/mpeg";
  audio.src = url;
  audio.play();
}

// JSON to Uint8Array parsing and visa versa

const JsonToArray = function (json) {
  let str = JSON.stringify(json, null, 0);
  let ret = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    ret[i] = str.charCodeAt(i);
  }
  return ret;
};

const binArrayToJson = function (binArray) {
  let str = "";
  for (let i = 0; i < binArray.length; i++) {
    str += String.fromCharCode(parseInt(binArray[i]));
  }
  return JSON.parse(str);
};

/**
 * Combine multiple Uint8Arrays into one.
 *
 * @param {Uint8Array[]} uint8arrays
 * @returns {Uint8Array}
 */
function concatenate(uint8arrays) {
  const totalLength = uint8arrays.reduce(
    (total, uint8array) => total + uint8array.byteLength,
    0
  );

  const result = new Uint8Array(totalLength);

  let offset = 0;
  uint8arrays.forEach((uint8array) => {
    result.set(uint8array, offset);
    offset += uint8array.byteLength;
  });

  return result;
}
