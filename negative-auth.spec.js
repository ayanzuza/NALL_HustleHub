import { test, expect } from '@playwright/test';

test('Negative Test: Unauthorized user cannot approve a booking', async ({ page }) => {
  const uniqueId = Date.now();
  const ownerEmail = `owner_${uniqueId}@test.com`;
  const attackerEmail = `attacker_${uniqueId}@test.com`;
  const password = 'Password123!';
  const gigTitle = `Exclusive Gig ${uniqueId}`;

  // 1. Register Owner and Create a Gig
  await page.goto('/register');
  await page.fill('#name', 'Owner Freelancer');
  await page.fill('#email', ownerEmail);
  await page.fill('#password', password);
  await page.selectOption('#role', 'freelancer');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login');

  await page.goto('/login');
  await page.fill('#email', ownerEmail);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/gigs');

  await page.goto('/gigs/create');
  await page.fill('#title', gigTitle);
  await page.fill('#description', 'Secure service');
  await page.fill('#price', '200');
  await page.selectOption('#category', 'Development');

  await page.click('button[type="submit"]');
  await page.waitForResponse(response => response.url().includes('/gigs') && (response.status() === 200 || response.status() === 201));
  await expect(page.locator(`text=${gigTitle}`)).toBeVisible({ timeout: 10000 });

  await page.click('text=Logout');
  await page.waitForURL('**/login');

  // 2. Register and Login as Attacker (Unauthorized Freelancer)
  await page.goto('/register');
  await page.fill('#name', 'Unauthorized User');
  await page.fill('#email', attackerEmail);
  await page.fill('#password', password);
  await page.selectOption('#role', 'freelancer');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login');

  await page.goto('/login');
  await page.fill('#email', attackerEmail);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/gigs');

  // 3. Navigate to Bookings; Verify the Approve Action is Absent for Foreign Bookings
  await page.goto('/bookings');
  const approveButton = page.locator(`tr:has-text("${gigTitle}") button:has-text("Approve")`);
  await expect(approveButton).toHaveCount(0);
});