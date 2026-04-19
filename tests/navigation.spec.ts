import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('header is present on home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
  });

  test('header is present on list page', async ({ page }) => {
    await page.goto('/list');
    await expect(page.locator('header')).toBeVisible();
  });

  test('logo links to home', async ({ page }) => {
    await page.goto('/list');
    await page.getByText('AF Tracker').click();
    await expect(page).toHaveURL('/');
  });

  test('Map nav link goes to home', async ({ page }) => {
    await page.goto('/list');
    await page.getByRole('link', { name: /map/i }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('List nav link goes to list page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /list/i }).first().click();
    await expect(page).toHaveURL('/list');
  });

  test('Sign in nav link goes to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/login');
  });

  test('Map button shows active state on home page', async ({ page }) => {
    await page.goto('/');
    const mapBtn = page.getByRole('link', { name: /map/i }).first().locator('button');
    // Active variant adds secondary background
    await expect(mapBtn).toHaveClass(/secondary/);
  });

  test('List button shows active state on list page', async ({ page }) => {
    await page.goto('/list');
    const listBtn = page.getByRole('link', { name: /list/i }).first().locator('button');
    await expect(listBtn).toHaveClass(/secondary/);
  });

  test('404 page shows not found message', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText(/404/)).toBeVisible();
    await expect(page.getByRole('link', { name: /go home/i })).toBeVisible();
  });

  test.describe('Mobile viewpoint (375px)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('header icons visible without text labels', async ({ page }) => {
      await page.goto('/');
      // Icons should be present (header has SVG icons)
      const headerSvgs = page.locator('header svg');
      const svgCount = await headerSvgs.count();
      expect(svgCount).toBeGreaterThan(0);
      // Text spans are hidden (hidden sm:inline) — not visible at 375px
      const mapSpan = page.locator('header span', { hasText: /^Map$/ }).first();
      await expect(mapSpan).toBeHidden();
    });
  });
});
