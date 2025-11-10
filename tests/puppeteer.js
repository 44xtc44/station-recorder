// puppeteer.js
// https://stackoverflow.com/questions/65031398/indexeddb-doesnt-keep-db-store-or-values-when-puppeteer-closed-chrome
"use strict";

/**
 * Run "node puppeteer.js"
 * Manual test if puppeteer is working at all. 
 * (Puppeteer site, edited sample)
 */

import puppeteer from "puppeteer";
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// Navigate the page to a URL.
await page.goto("https://developer.chrome.com/");

// Set screen size.
await page.setViewport({ width: 1080, height: 1024 });

// Type into search box using accessible input name.
await page.locator("aria/Search").fill("automate beyond recorder");

// Wait and click on first result.
await page.locator(".devsite-result-item-link").click();

// Locate the full title with a unique string.
const textSelector = await page
  .locator("text/Customize and automate")
  .waitHandle();
const fullTitle = await textSelector?.evaluate((el) => el.textContent);

// Print the full title.
console.log('The title of this blog post is "%s".', fullTitle);

await browser.close();
