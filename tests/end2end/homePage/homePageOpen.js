// homePageOpen.spec.js
// https://testomat.io/blog/playwright-tutorial-experience-testing-browser-extensions/

import { test, expect } from '@playwright/test';
import { homePageOpen } from './chromium';

test('Start the App idle.', async ({ page }) => {
    await expect(page.locator('script')).toBe("foo");
});
