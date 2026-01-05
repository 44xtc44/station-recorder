import { test as base, chromium, type BrowserContext } from "@playwright/test";
import * as path from "path";

// https://stackoverflow.com/questions/43042889/typescript-referenceerror-exports-is-not-defined

const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = "../.."; // path.join(__dirname, 'my-extension');
    const context = await chromium.launchPersistentContext(
      "/tmp/test-user-data-dir",
      {
        channel: "chromium",
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
      }
    );
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent("serviceworker");

    const extensionId = serviceWorker.url().split("/")[2];
    await use(extensionId);
  },
});
const expect = test.expect;

test('example test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('body')).toHaveText('Changed by my-extension');
});

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('body')).toHaveText('my-extension popup');
});