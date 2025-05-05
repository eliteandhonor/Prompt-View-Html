# Test info

- Name: window.__mainJsLoaded and window.app are available after app init
- Location: D:\Prompt View Html\public_html\test\playwright\check-mainjs-loaded.spec.js:3:5

# Error details

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://localhost:8000/", waiting until "load"

    at D:\Prompt View Html\public_html\test\playwright\check-mainjs-loaded.spec.js:21:14
```

# Page snapshot

```yaml
- navigation "Primary":
  - button "Toggle Sidebar": ☰
  - heading "Prompt Share" [level=1]
  - button "Go to Dashboard": 🏠 Dashboard
  - button "Go to Prompts": 📃 Prompts
  - searchbox "Search Prompts"
  - text: "Global database: All changes are instantly saved for all!"
  - button "Toggle theme (Auto, Dark, Light)": Toggle color theme
- main "Main Content":
  - button "List View": 📃
  - button "Grid View": 🔲
  - button "Add Prompt": ＋ Add Prompt
  - button "Import .md/.txt files": ⇪ Import .md/.txt
- region "Community":
  - heading "Comments" [level=2]
  - heading "Results/Shared Outputs" [level=2]
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test('window.__mainJsLoaded and window.app are available after app init', async ({ page }) => {
   4 |   // Listen for all console events
   5 |   page.on('console', msg => {
   6 |     console.log(`[browser console] ${msg.type()}: ${msg.text()}`);
   7 |   });
   8 |   // Listen for page errors
   9 |   page.on('pageerror', error => {
  10 |     console.log(`[browser pageerror] ${error.message}`);
  11 |   });
  12 |   // Listen for all responses and log Content-Type for main.js
  13 |   page.on('response', response => {
  14 |     if (response.url().includes('/js/main.js')) {
  15 |       response.headers().then(headers => {
  16 |         console.log(`[response] ${response.url()} Content-Type: ${headers['content-type']}`);
  17 |       });
  18 |     }
  19 |   });
  20 |
> 21 |   await page.goto('http://localhost:8000/');
     |              ^ Error: page.goto: Test ended.
  22 |   // Dump full HTML content for diagnostics
  23 |   const html = await page.content();
  24 |   console.log('DIAGNOSTIC: page.content (first 3000 chars):\n', html.slice(0, 3000));
  25 |
  26 |   // Wait for main.js to set the global
  27 |   try {
  28 |     await page.waitForFunction(() => window.__mainJsLoaded === true, null, { timeout: 5000 });
  29 |     await page.waitForFunction(() => typeof window.app === 'object', null, { timeout: 5000 });
  30 |   } catch (e) {
  31 |     console.log('DIAGNOSTIC: waitForFunction failed:', e);
  32 |   }
  33 |
  34 |   // Diagnostics
  35 |   const mainJsLoaded = await page.evaluate(() => window.__mainJsLoaded);
  36 |   const appType = await page.evaluate(() => typeof window.app);
  37 |   console.log('window.__mainJsLoaded:', mainJsLoaded);
  38 |   console.log('window.app type:', appType);
  39 |   expect(mainJsLoaded).toBe(true);
  40 |   expect(appType).toBe('object');
  41 | });
```