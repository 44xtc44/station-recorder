// sani.spec.js
// -- spec -- triggers playwright

/**
 * Test if we run at all. Needs .spec. for playwright
 */

import { test, expect } from '@playwright/test';
import sanitizeHtml from 'sanitize-html'; // Import the sanitizer

test('Test if we run at all. Should safely render user-provided HTML', async ({ page }) => {
  const dirtyHtml = '<p>Hello, world!</p><script>alert("XSS")</script><a href="https://example.com">Link</a>';

  // Sanitize the HTML to allow only specific tags/attributes
  const cleanHtml = sanitizeHtml(dirtyHtml, {
    allowedTags: ['p', 'a', 'strong'],
    allowedAttributes: {
      'a': ['href', 'target']
    },
    // Prevent iframes from YouTube, etc., by default
    allowedIframeHostnames: ['www.youtube.com']
  });

  // Use Playwright to set the sanitized content in the page
  await page.setContent(`<div>${cleanHtml}</div>`);

  // Verify the script tag is gone and link is safe
  await expect(page.locator('script')).not.toBeVisible(); // Script should be removed
  await expect(page.locator('a')).toHaveAttribute('href', 'https://example.com'); // Link attribute remains
  await expect(page.locator('p')).toHaveText('Hello, world!'); // Paragraph text remains
});
