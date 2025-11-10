// idbTestNoReload.js
"use strict";

/**
 * -- Fail -- so far
 * Run "node idbTestNoReload.js"
 * Puppeteer indexedDB (IDB) test.
 */
import puppeteer from "puppeteer";
import { createIndexedDb } from "./idbInitDb__v1.js";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    devtools: true,
    args: ["--start-maximized"],
  });
  const page = await browser.newPage();

  // create IDB
  await page.evaluate(async () => {
    const objStores = [
      {
        storeName: "appSettings",
        primaryKey: "id",
        indexNames: ["appSettingsIdx", "id"],
      },
      {
        storeName: "favorites",
        primaryKey: "id",
        indexNames: ["favoritesIdx", "id"],
      },
    ];
    const created = await createIndexedDb({
      dbName: "app_db",
      dbVersion: 1,
      batchCreate: true,
      objStores: objStores,
    });
    console.log("created->", created);
  });
})();
