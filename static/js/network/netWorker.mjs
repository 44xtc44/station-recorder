// netWorker.mjs

import { getRandomIntInclusive } from "../uiHelper.js";

const rand = getRandomIntInclusive(2, 10);
console.log("-> random ", rand)

// Had an issue with imports here, fixed by ren modules to .mjs.
self.onmessage = function (e) {
  console.log("-> netWorker received message", e.data);
  // Transfer e got an error.
  // Uncaught DataCloneError: Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': MessageEvent object could not be cloned.
  const obj = JSON.parse(JSON.stringify(e));
  self.postMessage({ txt: "netWorker " + "with an imported module, random " + rand, e: obj });
};
self.onerror = (e) => {
  const obj = JSON.parse(JSON.stringify(e));
  self.postMessage(obj);
  self.close();
};
