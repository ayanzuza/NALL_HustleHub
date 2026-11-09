import { test, expect } from '@playwright/test';

test('HustleHub+ Happy Path: Register, Create Gig, Book, Approve, and Verify Income', async ({ page }) => {
  const uniqueId = Date.now();
  const freelancerEmail = `freelancer_${uniqueId}@test.com`;
  const clientEmail = `client_${uniqueId}@test.com`;
  const password = 'Password123!';
  const gigTitle = `Web Development Service ${uniqueId}`;
  const gigPrice = '500';

  // 1. Register Freelancer
  await page.goto('/register');
  await page.fill('#name', 'Test Freelancer');
  await page.fill('#email', freelancerEmail);
  await page.fill('#password', password);
  await page.selectOption('#role', 'freelancer');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login');

  // 2. Freelancer Login & Gig Creation
  await page.goto('/login');
  await page.fill('#email', freelancerEmail);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/gigs');

  await page.goto('/gigs/create');
  await page.fill('#title', gigTitle);
  await page.fill('#description', 'A complete web application service.');
  await page.fill('#price', gigPrice);
  await page.selectOption('#category', 'Development');
  
  await page.click('button[type="submit"]');
  await page.waitForResponse(response => response.url().includes('/gigs') && (response.status() === 200 || response.status() === 201));
  await expect(page.locator(`text=${gigTitle}`)).toBeVisible({ timeout: 10000 });

  // 3. Logout Freelancer
  await page.click('text=Logout');
  await page.waitForURL('**/login');

  // 4. Register Client & Book Gig
  await page.goto('/register');
  await page.fill('#name', 'Test Client');
  await page.fill('#email', clientEmail);
  await page.fill('#password', password);
  await page.selectOption('#role', 'client');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login');

  await page.goto('/login');
  await page.fill('#email', clientEmail);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/gigs');

  await page.click(`div.gig-card:has-text("${gigTitle}") button:has-text("Book Service")`);
  await page.click('button:has-text("Confirm Booking")');
  await expect(page.locator('text=Booking created')).toBeVisible();

  // 5. Logout Client
  await page.click('text=Logout');
  await page.waitForURL('**/login');

  // 6. Freelancer Login & Approval
  await page.goto('/login');
  await page.fill('#email', freelancerEmail);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/gigs');

  await page.goto('/bookings');
  await page.click(`tr:has-text("${gigTitle}") button:has-text("Approve")`);
  await expect(page.locator(`tr:has-text("${gigTitle}") >> text=Approved`)).toBeVisible();

  // 7. Income Verification
  await page.goto('/income');
  await expect(page.locator(`text=R${gigPrice}`)).toBeVisible();
});