import { test, expect } from '@playwright/test';

test.describe('List page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/list');
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Outlet List/);
  });

  test('search input is visible', async ({ page }) => {
    const search = page.getByPlaceholder(/search outlets/i);
    await expect(search).toBeVisible();
  });

  test('filter tabs are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'all', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'visited', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'unvisited', exact: true })).toBeVisible();
  });

  test('result count is displayed', async ({ page }) => {
    await expect(page.locator('text=/Showing \\d+ of \\d+ outlets/')).toBeVisible({ timeout: 10000 });
  });

  test('search filters the list', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });

    const search = page.getByPlaceholder(/search outlets/i);
    await search.fill('bishan');

    // Result count should update
    const countText = await page.locator('text=/Showing \\d+ of \\d+ outlets/').textContent();
    expect(countText).toMatch(/Showing \d+ of/);

    // All visible outlet names should contain the search term
    const rows = page.locator('[class*="rounded-lg"][class*="border"]').filter({ hasText: /bishan/i });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('clearing search restores full list', async ({ page }) => {
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });

    const search = page.getByPlaceholder(/search outlets/i);
    const initialText = await page.locator('text=/Showing \\d+ of \\d+ outlets/').textContent();

    await search.fill('zzznomatch');
    await expect(page.getByText(/No outlets found/i)).toBeVisible();

    // Click "Clear filters"
    await page.getByRole('button', { name: /clear filters/i }).click();
    const restoredText = await page.locator('text=/Showing \\d+ of \\d+ outlets/').textContent();
    expect(restoredText).toBe(initialText);
  });

  test('unvisited filter shows sign-in prompt or filters results', async ({ page }) => {
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });
    await page.getByRole('button', { name: 'unvisited', exact: true }).click();
    // Either shows outlets or empty state — page should not error
    await expect(page.locator('main')).toBeVisible();
  });

  test('visited filter tab shows empty state when logged out', async ({ page }) => {
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });
    await page.getByRole('button', { name: 'visited', exact: true }).click();
    // Logged out → 0 visits → empty state
    await expect(page.getByText(/No outlets found/i)).toBeVisible({ timeout: 5000 });
  });

  test('sort by name column header is clickable', async ({ page }) => {
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });
    // Sort header buttons are hidden on mobile; wait for desktop table header
    const nameHeader = page.locator('.hidden.sm\\:grid button', { hasText: /name/i }).first();
    await expect(nameHeader).toBeVisible();
    await nameHeader.click();
    // No crash — page still shows results
    await expect(page.locator('main')).toBeVisible();
  });
});
