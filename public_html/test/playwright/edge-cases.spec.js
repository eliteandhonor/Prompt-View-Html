// Playwright E2E tests for edge cases (long input, network errors, etc.)
const { test, expect } = require('@playwright/test');

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Capture and print all browser console logs for maximum debug output
    page.on('console', msg => {
      console.log(`[BROWSER][${msg.type()}]`, msg.text());
    });
  });

  test('handles very long comment input gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="prompt-title"]');
    const longComment = 'A'.repeat(2000);
    await page.fill('#comments-section input[name="text"]', longComment);
    await page.click('#comments-section button[type="submit"]');
    // Should appear in the list, truncated or scrollable
    await expect(page.locator('#comments-list')).toContainText(longComment.slice(0, 100));
  });

  test('handles very long result input gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="prompt-title"]');
    const longResult = 'B'.repeat(3000);
    await page.fill('#results-list ~ form textarea[name="value"]', longResult);
    await page.click('#results-list ~ form button[type="submit"]');
    // Should appear in the list, truncated or scrollable
    await expect(page.locator('#results-list')).toContainText(longResult.slice(0, 100));
  });

  test('shows error feedback for network error on comment delete', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="prompt-title"]');
    // Add a comment to delete
    await page.fill('#comments-section input[name="text"]', 'To be deleted');
    await page.click('#comments-section button[type="submit"]');
    await expect(page.locator('#comments-list')).toContainText('To be deleted');
    // Simulate network error on delete
    await page.route('/api/comments.php*', route => route.abort());
    const firstDeleteBtn = await page.$('#comments-list .delete-comment-btn');
    if (firstDeleteBtn) {
      await firstDeleteBtn.click();
      await page.waitForTimeout(100);
      await page.keyboard.press('Enter');
      await expect(page.locator('.toast, [role="alert"]')).toBeVisible();
    }
    await page.unroute('/api/comments.php*');
  });

  test('shows error feedback for network error on result delete', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="prompt-title"]');
    // Add a result to delete
    await page.fill('#results-list ~ form textarea[name="value"]', 'To be deleted');
    await page.click('#results-list ~ form button[type="submit"]');
    await expect(page.locator('#results-list')).toContainText('To be deleted');
    // Simulate network error on delete
    await page.route('/api/results.php*', route => route.abort());
    const firstDeleteBtn = await page.$('#results-list .delete-result-btn');
    if (firstDeleteBtn) {
      await firstDeleteBtn.click();
      await page.waitForTimeout(100);
      await page.keyboard.press('Enter');
      await expect(page.locator('.toast, [role="alert"]')).toBeVisible();
    }
    await page.unroute('/api/results.php*');
  });
});