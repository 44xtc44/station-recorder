// worker.mjs

import { getRandomIntInclusive } from "../uiHelper.js";

const foo = getRandomIntInclusive(2, 10);
console.log("-> random ", foo)

// no import - simple, had an issue with imports here, fixed by ren modules to .mjs
self.onmessage = function (e) {
  console.log("-> worker received message", e.data);
  // Uncaught DataCloneError: Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope': MessageEvent object could not be cloned.
  const obj = JSON.parse(JSON.stringify(e));
  self.postMessage({ txt: "worker " + "without an imported module", e: obj });
};
self.onerror = (e) => {
  const obj = JSON.parse(JSON.stringify(e));
  self.postMessage(obj);
  self.close();
};
