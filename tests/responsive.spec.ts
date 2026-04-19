import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-360', width: 360, height: 780 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

for (const vp of viewports) {
  test.describe(`Viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('home page — no horizontal scroll', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance
    });

    test('home page — header is visible and not clipped', async ({ page }) => {
      await page.goto('/');
      const header = page.locator('header');
      await expect(header).toBeVisible();
      const box = await header.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(vp.width + 2);
    });

    test('home page — map container is visible', async ({ page }) => {
      await page.goto('/');
      const map = page.locator('.leaflet-container');
      await expect(map).toBeVisible({ timeout: 15000 });
      const box = await map.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('list page — no horizontal scroll', async ({ page }) => {
      await page.goto('/list');
      await page.waitForLoadState('networkidle');
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);
    });

    test('list page — search input is usable', async ({ page }) => {
      await page.goto('/list');
      // Wait for the page to load fully (list data + search input)
      const search = page.getByPlaceholder(/search outlets/i);
      await expect(search).toBeVisible({ timeout: 15000 });
      const box = await search.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(100);
    });

    test('list page — filter buttons visible and not overflowing', async ({ page }) => {
      await page.goto('/list');
      const allBtn = page.getByRole('button', { name: 'all', exact: true });
      await expect(allBtn).toBeVisible({ timeout: 15000 });
      const box = await allBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 2);
    });

    test('login page — form is usable', async ({ page }) => {
      await page.goto('/login');
      const email = page.getByPlaceholder(/email/i);
      await expect(email).toBeVisible();
      const box = await email.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(100);
    });
  });
}

test.describe('Map height is responsive', () => {
  test('map is shorter on mobile than desktop', async ({ browser }) => {
    // Mobile context
    const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto('/');
    const mobileMap = mobilePage.locator('.leaflet-container');
    await expect(mobileMap).toBeVisible({ timeout: 15000 });
    await mobilePage.waitForTimeout(300); // allow React state to settle
    const mobileBox = await mobileMap.boundingBox();
    await mobileCtx.close();

    // Desktop context
    const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto('/');
    const desktopMap = desktopPage.locator('.leaflet-container');
    await expect(desktopMap).toBeVisible({ timeout: 15000 });
    await desktopPage.waitForTimeout(300);
    const desktopBox = await desktopMap.boundingBox();
    await desktopCtx.close();

    expect(mobileBox).not.toBeNull();
    expect(desktopBox).not.toBeNull();
    // 50vh at 812px height = 406px; 65vh at 800px height = 520px → mobile < desktop
    expect(mobileBox!.height).toBeLessThan(desktopBox!.height);
  });
});
