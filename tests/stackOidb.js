// stackOidb.js

/**
 * Run "node stackOidb.js"
 *
 * Test if puppeteer is running at all with indexedDB.
 * (I edited sample from)
 * https://stackoverflow.com/questions/65031398/indexeddb-doesnt-keep-db-store-or-values-when-puppeteer-closed-chrome
 *
 * "Dev tools", "Application", "indexedDB" in chrome browser
 * https://developer.chrome.com/docs/devtools/storage/extensionstorage
 * (for local storage user - puppeteer code)
 * https://stackoverflow.com/questions/62356783/read-domstorage-localstorage-via-chrome-devtools-protocol
 *
 */

import { createDB } from "./stackOidbCode.js"; // before puppeteer
const cdb = createDB.toString();
import puppeteer from "puppeteer";

// "Dev tools", "Application", "indexedDB" in chrome browser
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    devtools: true,
    args: ["--start-maximized"],
  });
  const page = (await browser.pages())[0];
  // await page.setViewport({ width: 1000, height: 1200});
  await page.goto("https:google.com");

  page.on("console", (msg) => console.log(msg.text()));
  let foo = "bar"
  await page.evaluate((foo) => {
    console.log("createDB->", foo);
    /*     var db;
    var item = [
      {
        name: "banana",
        price: "$1.99",
        description: "It is a purple banana!",
        created: new Date().getTime(),
      },
      {
        name: "apple",
        price: "$2.99",
        description: "It is a red apple!",
        created: new Date().getTime(),
      },
    ];
    var openReq = indexedDB.open("test_db", 1);

    openReq.onupgradeneeded = function (e) {
      var db = e.target.result;
      console.log("running onupgradeneeded");
      if (!db.objectStoreNames.contains("store")) {
        console.log("no store");
        var storeOS = db.createObjectStore("store", { keyPath: "name" });
      }
    };
    openReq.onsuccess = async function (e) {
      console.log("running onsuccess");
      db = e.target.result;
      await addItem(item);
      await getItem();
    };
    openReq.onerror = function (e) {
      console.log("onerror!");
      console.dir(e);
    };

    async function addItem(item) {
      var tx = db.transaction(["store"], "readwrite");
      var store = tx.objectStore("store");
      var req;
      item.forEach(function (data) {
        req = store.add(data);
      });
      req.onerror = function (e) {
        console.log("addItem->Error", e.target.error.name);
      };
      req.onsuccess = function (e) {
        console.log("addItem->addItem->Woot! Did it", e);
      };
      tx.oncomplete = function (e) {
        console.log("addItem->tx completed", e);
      };
    }

    async function getItem() {
      var tx = db.transaction(["store"], "readonly");
      var store = tx.objectStore("store");
      var req = store.getAll();
      req.onerror = function (e) {
        console.log("Error", e.target.error.name);
      };
      req.onsuccess = function (e) {
        console.log("getItem->", e);
      };
    }
     */
  });
})();
