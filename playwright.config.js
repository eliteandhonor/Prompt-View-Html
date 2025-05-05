// Playwright configuration for E2E testing (placed in public_html/test/playwright)

const { defineConfig } = require('@playwright/test');

/** 
 * Playwright config: uses the built-in PHP dev server (localhost:8000) as baseURL. 
 */
module.exports = defineConfig({
  testDir: __dirname,
  timeout: 30 * 1000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8000',
    headless: true,
    actionTimeout: 0,
    ignoreHTTPSErrors: true,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});