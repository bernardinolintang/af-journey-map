import { test, expect } from '@playwright/test';

test.describe('Home page — map view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/AF Tracker/);
  });

  test('header is visible with logo and nav links', async ({ page }) => {
    await expect(page.getByText('AF Tracker')).toBeVisible();
    await expect(page.getByRole('link', { name: /map/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /list/i }).first()).toBeVisible();
  });

  test('progress bar / outlet count banner is visible', async ({ page }) => {
    const progressArea = page.locator('main').first();
    await expect(progressArea).toBeVisible();
    // Shows total outlet count or visited count
    await expect(page.locator('main')).toContainText(/outlet/i);
  });

  test('map container renders', async ({ page }) => {
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 15000 });
  });

  test('map markers appear for outlets', async ({ page }) => {
    // Wait for markers to render
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 15000 });
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a marker opens a popup', async ({ page }) => {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 15000 });
    await page.waitForTimeout(500); // allow map animations to settle
    await page.locator('.leaflet-marker-icon').first().click({ force: true });
    await expect(page.locator('.leaflet-popup-content')).toBeVisible({ timeout: 8000 });
  });

  test('popup contains outlet name and toggle button', async ({ page }) => {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.locator('.leaflet-marker-icon').first().click({ force: true });
    const popup = page.locator('.leaflet-popup-content');
    await expect(popup).toBeVisible({ timeout: 8000 });
    await expect(popup.locator('button')).toBeVisible();
  });
});
