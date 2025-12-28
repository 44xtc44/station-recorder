
// chromium_01.js

/**
 * "npx run chromium.js", while debugging the test module.
 * "npx playwright test", if fixed, rename to chromium.spec.js
 */
import { chromium } from "playwright";

(async () => {
  const pathToExtension =  "../..";
  const userDataDir = "/tmp/test-user-data-dir";
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  // https://playwright.dev/docs/chrome-extensions
  // rewrite to use use(...)

/* 
  // Open a new page, remote URL.
  const page = await browserContext.newPage();
  await page.goto("https://example.com/");

   */
  // Test the service worker as you would any other worker.
  // await browserContext.close();
})();
