// chromium.js
import { chromium } from "playwright";

export { homePageOpen };

/**
 * https://testomat.io/blog/playwright-tutorial-experience-testing-browser-extensions/
 * https://www.browserstack.com/guide/fixtures-in-playwright
 */

/**
 * Run fun from command line.
 *  npx run-func chromium.js homePageOpen -y // yes
 * 
 * @returns 
 */

async function homePageOpen() {
  const { pathToHomePage, pathToExtension } = await resolveExtensionPage();
  const userDataDir = ""; // "" means temporary directory
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: false,
    args: [
      // `--headless=new`,
      `--disable-extensions-except=${pathToExtension}`,  // on/off no impact
      `--load-extension=${pathToExtension}`,
      `--allow-file-access-from-files`,
     //  `--allow-legacy-extension-manifests`,
    ],
  });

  const page = await browserContext.newPage();
  await page.goto(pathToHomePage);

  // Test the service worker section.

  // await browserContext.close(); // Close browser and/or end of test.
  return "foo";
}

/**
 * Keep the paths intact if module is moved around in /tests folder.
 * Context page loader needs a full qualified path name.
 * @returns {Promise<{pathToHomePage:string, pathToExtension: string}>} home page paths || Error
 */
function resolveExtensionPage() {
  return new Promise((resolve, _) => {
    const __dirname = import.meta.dirname; // this test module's dir

    const array = __dirname.split("/");
    for (const [idx, dir] of array.entries()) {
      if (dir === "tests") {
        // pathToHomePage; start page of app
        const protocol = "file://";
        const pkgDir = array.slice(0, idx).join("/");
        const homePageRelative = "/static/addon.html";
        const pathToHomePage = protocol + pkgDir + homePageRelative;

        // pathToExtension; ../.. dir of manifest.json
        let stepUp = [];
        for (let i = 0; i < array.length - idx; i++) {
          stepUp.push("..");
        }
        resolve({
          pathToHomePage: pathToHomePage,
          pathToExtension: stepUp.join("/"),
        });
      }
    }
    throw new Error("Test parent folder not named '/tests'.");
  });
}
