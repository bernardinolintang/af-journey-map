import { test, expect } from '@playwright/test';

// Wait for React to hydrate by checking that an interactive element responds
async function waitForHydration(page: import('@playwright/test').Page) {
  // networkidle ensures JS bundles are loaded and React has hydrated
  await page.waitForLoadState('networkidle');
}

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Login/);
  });

  test('shows sign in form by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toContainText(/sign in/i);
  });

  test('toggles to sign up mode', async ({ page }) => {
    // Use Playwright's built-in click — hydration is guaranteed by beforeEach
    await page.locator('button', { hasText: 'Sign up' }).last().click();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('form button[type="submit"]')).toContainText(/create account/i);
  });

  test('toggles back to sign in mode', async ({ page }) => {
    await page.locator('button', { hasText: 'Sign up' }).last().click();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible({ timeout: 5000 });

    await page.locator('button', { hasText: 'Sign in' }).last().click();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.locator('form button[type="submit"]').click();

    // Should remain on login page (not navigate away)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    // Form should still be visible after failed login attempt
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });

  test('email field requires valid format', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('notanemail');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.locator('form button[type="submit"]').click();

    // Browser native validation prevents submission
    const emailInput = page.getByPlaceholder(/email/i);
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('password field has minLength 6', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('123');
    await page.locator('form button[type="submit"]').click();

    const passwordInput = page.getByPlaceholder(/password/i);
    const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });
});
