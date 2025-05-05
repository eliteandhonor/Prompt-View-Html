# Test info

- Name: Prompt CRUD >> can create, read, update, and delete a prompt
- Location: D:\Prompt View Html\public_html\test\playwright\prompt-crud.spec.js:91:3

# Error details

```
Error: Timed out 10000ms waiting for expect(locator).toBeVisible()

Locator: locator('[data-testid="prompt-block"]').filter({ hasText: 'Test Prompt' }).first()
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 10000ms
  - waiting for locator('[data-testid="prompt-block"]').filter({ hasText: 'Test Prompt' }).first()

    at createPrompt (D:\Prompt View Html\public_html\test\playwright\prompt-crud.spec.js:39:36)
    at D:\Prompt View Html\public_html\test\playwright\prompt-crud.spec.js:99:24
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
  - text: No comments loaded (API integration pending).
  - button "Add Comment (not yet implemented)" [disabled]
  - heading "Results/Shared Outputs" [level=2]
  - text: No results loaded (API integration pending).
```

# Test source

```ts
   1 | // Playwright E2E test for Prompt CRUD (Create, Read, Update, Delete)
   2 | // Refactored for clarity, maintainability, and modularity.
   3 |
   4 | const { test, expect } = require('@playwright/test');
   5 |
   6 | /**
   7 |  * Navigates to the Prompts section of the app.
   8 |  * @param {import('@playwright/test').Page} page
   9 |  */
   10 | async function gotoPromptsSection(page) {
   11 |   await page.goto('/');
   12 |   await page.waitForFunction(() => window.app !== undefined);
   13 |   await page.click('#nav-prompts-btn');
   14 |   await expect(page.locator('[data-testid="prompt-list"]')).toBeVisible();
   15 |   // Clear any search/filter input if present
   16 |   const searchInput = await page.$('[data-testid="prompt-search-input"]');
   17 |   if (searchInput) {
   18 |     await searchInput.fill('');
   19 |     await searchInput.blur();
   20 |   }
   21 | }
   22 |
   23 | /**
   24 |  * Creates a new prompt and returns its data-id.
   25 |  * @param {import('@playwright/test').Page} page
   26 |  * @param {string} title
   27 |  * @param {string} content
   28 |  * @returns {Promise<string>} The data-id of the created prompt.
   29 |  */
   30 | async function createPrompt(page, title, content) {
   31 |   await page.click('[data-testid="add-prompt-btn"]');
   32 |   await expect(page.locator('[data-testid="prompt-title-input"]')).toBeVisible();
   33 |   await page.fill('[data-testid="prompt-title-input"]', title);
   34 |   await page.fill('[data-testid="prompt-content-input"]', content);
   35 |   await page.click('[data-testid="save-prompt-btn"]');
   36 |   // Wait for either the prompt block or the prompt title to appear
   37 |   const promptBlockLocator = page.locator('[data-testid="prompt-block"]', { hasText: title }).first();
   38 |   const promptTitleLocator = page.locator('[data-testid="prompt-title"]', { hasText: title }).first();
>  39 |   await expect(promptBlockLocator).toBeVisible({ timeout: 10000 });
      |                                    ^ Error: Timed out 10000ms waiting for expect(locator).toBeVisible()
   40 |   await expect(promptTitleLocator).toBeVisible({ timeout: 10000 });
   41 |   // Diagnostic: log all prompt titles in the DOM after creation
   42 |   const allTitles = await page.$$eval('[data-testid="prompt-title"]', els => els.map(el => el.textContent));
   43 |   console.log("DIAGNOSTIC: Prompt titles in DOM after creation:", allTitles);
   44 |   return await promptTitleLocator.getAttribute('data-id');
   45 | }
   46 |
   47 | /**
   48 |  * Reads (views) a prompt by its data-id and asserts its title/content.
   49 |  * @param {import('@playwright/test').Page} page
   50 |  * @param {string} promptId
   51 |  * @param {string} expectedTitle
   52 |  * @param {string} expectedContent
   53 |  */
   54 | async function readPrompt(page, promptId, expectedTitle, expectedContent) {
   55 |   const selector = `[data-testid="prompt-title"][data-id="${promptId}"]`;
   56 |   await page.locator(selector).scrollIntoViewIfNeeded();
   57 |   await page.waitForTimeout(100); // ensure in view
   58 |   await page.click(selector);
   59 |   await expect(page.locator('[data-testid="prompt-detail-title"]')).toHaveText(expectedTitle);
   60 |   await expect(page.locator('[data-testid="prompt-detail-content"]')).toHaveText(expectedContent);
   61 | }
   62 |
   63 | /**
   64 |  * Updates a prompt's title by its data-id.
   65 |  * @param {import('@playwright/test').Page} page
   66 |  * @param {string} newTitle
   67 |  * @param {string} promptId
   68 |  */
   69 | async function updatePrompt(page, newTitle, promptId) {
   70 |   await page.click('[data-testid="edit-prompt-btn"]');
   71 |   await page.fill('[data-testid="prompt-title-input"]', newTitle);
   72 |   await page.click('[data-testid="save-prompt-btn"]');
   73 |   const updatedTitleLocator = page.locator('[data-testid="prompt-title"]', { hasText: newTitle }).and(page.locator(`[data-id="${promptId}"]`));
   74 |   await expect(updatedTitleLocator).toBeVisible();
   75 | }
   76 |
   77 | /**
   78 |  * Deletes a prompt by its data-id.
   79 |  * @param {import('@playwright/test').Page} page
   80 |  * @param {string} promptId
   81 |  * @param {string} promptTitle
   82 |  */
   83 | async function deletePrompt(page, promptId, promptTitle) {
   84 |   await page.click('[data-testid="delete-prompt-btn"]');
   85 |   await page.click('[data-testid="confirm-delete-btn"]');
   86 |   const deletedPromptLocator = page.locator('[data-testid="prompt-title"]', { hasText: promptTitle }).and(page.locator(`[data-id="${promptId}"]`));
   87 |   await expect(deletedPromptLocator).not.toBeVisible();
   88 | }
   89 |
   90 | test.describe('Prompt CRUD', () => {
   91 |   test('can create, read, update, and delete a prompt', async ({ page }) => {
   92 |     try {
   93 |       // Step 1: Go to Prompts section
   94 |       await gotoPromptsSection(page);
   95 |
   96 |       // Step 2: CREATE a new prompt
   97 |       const initialTitle = 'Test Prompt';
   98 |       const initialContent = 'This is a test prompt.';
   99 |       const promptId = await createPrompt(page, initialTitle, initialContent);
  100 |
  101 |       // Step 3: READ the created prompt
  102 |       await readPrompt(page, promptId, initialTitle, initialContent);
  103 |
  104 |       // Step 4: UPDATE the prompt's title
  105 |       const updatedTitle = 'Test Prompt Updated';
  106 |       await updatePrompt(page, updatedTitle, promptId);
  107 |
  108 |       // Step 5: DELETE the prompt
  109 |       await deletePrompt(page, promptId, updatedTitle);
  110 |
  111 |     } catch (err) {
  112 |       // Diagnostic: print modal system globals
  113 |       const diag = await page.evaluate(() => ({
  114 |         modalsInit: window.__modalsInit,
  115 |         crudModalEventReceived: window.__crudModalEventReceived,
  116 |         promptTitleInputPresent: window.__promptTitleInputPresent
  117 |       }));
  118 |       console.log("DIAGNOSTIC GLOBALS:", diag);
  119 |       throw err;
  120 |     }
  121 |   });
  122 | });
```