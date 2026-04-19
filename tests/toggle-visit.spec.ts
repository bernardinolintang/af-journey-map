import { test, expect } from '@playwright/test';

// Sonner renders toasts in an <ol data-sonner-toaster> container;
// individual toasts are <li data-sonner-toast>. We also accept the toast text directly.
const toastLocator = (page: import('@playwright/test').Page) =>
  page.locator('[data-sonner-toaster] li, [data-sonner-toast]').first();

test.describe('Toggle visit — logged out', () => {
  test('clicking map popup button shows sign-in toast', async ({ page }) => {
    await page.goto('/');

    // Wait for map markers to load
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 20000 });
    // Wait briefly for map animations to settle
    await page.waitForTimeout(500);

    await page.locator('.leaflet-marker-icon').first().click({ force: true });

    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 8000 });

    // Click the toggle button in the popup
    await popup.locator('button').click();

    // Should show a toast notification prompting to sign in
    const toast = toastLocator(page);
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/sign in/i);
  });

  test('toast contains Sign in action button', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 20000 });
    await page.waitForTimeout(500);

    await page.locator('.leaflet-marker-icon').first().click({ force: true });

    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 8000 });
    await popup.locator('button').click();

    const toast = toastLocator(page);
    await expect(toast).toBeVisible({ timeout: 8000 });

    // Toast action button should navigate to login
    const actionBtn = toast.getByRole('button', { name: /sign in/i });
    await expect(actionBtn).toBeVisible();
  });

  test('list row click shows sign-in toast when logged out', async ({ page }) => {
    await page.goto('/list');
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });

    // Click first outlet row (the card/row items are the only clickable borders in the list)
    const firstRow = page.locator('main .space-y-1\\.5 > div').first();
    await firstRow.click();

    const toast = toastLocator(page);
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/sign in/i);
  });

  test('toast sign-in button navigates to login page', async ({ page }) => {
    await page.goto('/list');
    await page.waitForSelector('text=/Showing \\d+ of \\d+ outlets/', { timeout: 10000 });

    const firstRow = page.locator('main .space-y-1\\.5 > div').first();
    await firstRow.click();

    const toast = toastLocator(page);
    await expect(toast).toBeVisible({ timeout: 8000 });

    await toast.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/login');
  });
});
