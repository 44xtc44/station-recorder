// @ts-check
import { createDB, hello } from "../tests/stackOidbCode.js";
import { test, expect, chromium } from "@playwright/test";

/**
 * npx playwright test tests/todo-page.spec.ts
 *
 * playwright context.exposeFunction callback
 * https://stackoverflow.com/questions/72790510/playwright-use-page-within-the-context-of-exposed-function
 */

const cdb = createDB.toString();

test("has title", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  hello();

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);

  (async () => {
    //
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("https://example.org/");
    console.log(
      await page.evaluate(() => {
        return typeof window.indexedDB;
      })
    );
    await browser.close();
  })();
});

test("get started link", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  // Click the get started link.
  await page.getByRole("link", { name: "Get started" }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(
    page.getByRole("heading", { name: "Installation" })
  ).toBeVisible();
});
