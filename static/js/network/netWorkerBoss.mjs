// netWorkerBoss.mjs

/**
 * Problem:
 * Multiple fetch request loop recorder threads
 * with in-mem data where killed by a "World stations" sort()
 * thread with full CPU consumption.
 * All threads where running in the interpreters main thread.
 * So I had to disable the UI for "World" search during recording.
 *
 * Solution:
 * Idea is to use a "singleton" class pattern to run
 * multiple fetch request loop threats in only one
 * additional process. On one particular CPU core.
 * Not like the "dbLoader" worker: "Use and kill it".
 * Means the OS spawns a new interpreter service on another CPU core.
 * A "new Worker()" process that runs on demand on another (same) core.
 *
 * A challenge is to solve the problem that the
 * worker might be killed by the OS,
 * i.e. Android internal timeout because of no activity.
 * Therefore we must test if the worker is still alive if we need it.
 * When not spawn a new Worker.
 *
 * Can be enhanced for real production by using a worker pool
 * to use additonal services. Ask for amount of CPUs.
 *
 * Implementation:
 * (1) UI call -> Instanciate a worker process.
 *   Use it in a function, call the worker module to start a loop.
 *   User, UI ends the loop.
 * (2) UI call -> Instanciate a worker process. Singleton returns the same Worker.
 *   Same as (1), but we don't know if the worker is available anymore.
 *   Singleton spawns a new Worker if the old one was "dismissed".
 * (3) UI call -> (2)
 * (4) UI call -> (2)
 *
 * https://medium.com/@artemkhrenov/understanding-the-singleton-pattern-in-modern-javascript-128987efd54d
 */

/**
 * This guy is testable with Playwright.
 * "dbLoader" runs as package, but is not testable.
 * Seems to be a problem with placing the instanciator.
 * Class works.
 * Function and global created webWorker instances fail. So far.
 */
export { NetWorker };

class NetWorker {
  constructor() {
    if (NetWorker.instance) return NetWorker.instance;
    this.worker = null;
    this.workerPath = "netWorker.mjs";
    NetWorker.instance = this;
  }
  static getInstance() {
    if (!NetWorker.instance) NetWorker.instance = new NetWorker();
    return NetWorker.instance;
  }
  spawnWorker() {
    // First call.
    if (this.worker === null) {
      this.worker = new Worker(new URL(this.workerPath, import.meta.url), {
        type: "module",
      });
    }
    this.worker.postMessage({ txt: "au travail, monsieur" });
    this.worker.onmessage = (e) => {
      console.log("-> caller received message.", e.data);
    };
    this.worker.onerror = (e) => {
      // Test, may be timeout.
      console.log("-> worker reported error.", e);
      // OS killed worker.
      this.worker === null;
      // New instance.
      this.worker = new Worker(new URL("worker.mjs", import.meta.url), {
        type: "module",
      });
    };
  }

  killWorker() {
    this.worker.postMessage({ txt: "dismissed", action: "close" });
    this.worker.onmessage = (e) => {
      if (e.data.txt === "closed") {
        console.log("-> killWorker ", e.data);
      }
    };
    this.worker.onerror = (e) => {
      console.log("-> killWorker error. ", e);
    };
  }
}

/* // Usage
const db1 = new NetWorker();
const db2 = new NetWorker();

console.log(db1 === db2); // true - same instance */
