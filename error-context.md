# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.js >> HustleHub+ Happy Path: Register, Create Gig, Book, Approve, and Verify Income
- Location: e2e\happy-path.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - navigation [ref=f2e4]:
    - generic [ref=f2e5]: HustleHub+
    - link "Browse gigs" [ref=f2e6] [cursor=pointer]:
      - /url: /gigs
    - link "My gigs" [ref=f2e7] [cursor=pointer]:
      - /url: /my-gigs
    - link "Bookings" [ref=f2e8] [cursor=pointer]:
      - /url: /bookings
    - link "Income" [ref=f2e9] [cursor=pointer]:
      - /url: /income
    - generic [ref=f2e10]: Test Freelancer (freelancer)
    - button "Log out" [ref=f2e11]
  - generic [ref=f2e13]:
    - heading "Create a New Gig" [level=2] [ref=f2e14]
    - generic [ref=f2e15]: "Category must be one of: design, development, writing, marketing, video, audio, business, other"
    - generic [ref=f2e16]:
      - generic [ref=f2e17]:
        - generic [ref=f2e18]: Gig Title
        - textbox "Gig Title" [ref=f2e19]: Web Development Service 1794246700157
      - generic [ref=f2e20]:
        - generic [ref=f2e21]: Description
        - textbox "Description" [ref=f2e22]: A complete web application service.
      - generic [ref=f2e23]:
        - generic [ref=f2e24]: Price (ZAR)
        - spinbutton "Price (ZAR)" [ref=f2e25]: "500"
      - generic [ref=f2e26]:
        - generic [ref=f2e27]: Category
        - combobox "Category" [ref=f2e28]:
          - option "Development" [selected]
          - option "Design"
          - option "Writing"
          - option "Marketing"
      - button "Publish Gig" [ref=f2e29]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('HustleHub+ Happy Path: Register, Create Gig, Book, Approve, and Verify Income', async ({ page }) => {
  4  |   const uniqueId = Date.now();
  5  |   const freelancerEmail = `freelancer_${uniqueId}@test.com`;
  6  |   const clientEmail = `client_${uniqueId}@test.com`;
  7  |   const password = 'Password123!';
  8  |   const gigTitle = `Web Development Service ${uniqueId}`;
  9  |   const gigPrice = '500';
  10 | 
  11 |   // 1. Register Freelancer
  12 |   await page.goto('/register');
  13 |   await page.fill('#name', 'Test Freelancer');
  14 |   await page.fill('#email', freelancerEmail);
  15 |   await page.fill('#password', password);
  16 |   await page.selectOption('#role', 'freelancer');
  17 |   await page.click('button[type="submit"]');
  18 |   await page.waitForURL('**/login');
  19 | 
  20 |   // 2. Freelancer Login & Gig Creation
  21 |   await page.goto('/login');
  22 |   await page.fill('#email', freelancerEmail);
  23 |   await page.fill('#password', password);
  24 |   await page.click('button[type="submit"]');
  25 |   await page.waitForURL('**/gigs');
  26 | 
  27 |   await page.goto('/gigs/create');
  28 |   await page.fill('#title', gigTitle);
  29 |   await page.fill('#description', 'A complete web application service.');
  30 |   await page.fill('#price', gigPrice);
  31 |   await page.selectOption('#category', 'Development');
  32 |   
  33 |   await page.click('button[type="submit"]');
> 34 |   await page.waitForResponse(response => response.url().includes('/gigs') && (response.status() === 200 || response.status() === 201));
     |              ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  35 |   await expect(page.locator(`text=${gigTitle}`)).toBeVisible({ timeout: 10000 });
  36 | 
  37 |   // 3. Logout Freelancer
  38 |   await page.click('text=Logout');
  39 |   await page.waitForURL('**/login');
  40 | 
  41 |   // 4. Register Client & Book Gig
  42 |   await page.goto('/register');
  43 |   await page.fill('#name', 'Test Client');
  44 |   await page.fill('#email', clientEmail);
  45 |   await page.fill('#password', password);
  46 |   await page.selectOption('#role', 'client');
  47 |   await page.click('button[type="submit"]');
  48 |   await page.waitForURL('**/login');
  49 | 
  50 |   await page.goto('/login');
  51 |   await page.fill('#email', clientEmail);
  52 |   await page.fill('#password', password);
  53 |   await page.click('button[type="submit"]');
  54 |   await page.waitForURL('**/gigs');
  55 | 
  56 |   await page.click(`div.gig-card:has-text("${gigTitle}") button:has-text("Book Service")`);
  57 |   await page.click('button:has-text("Confirm Booking")');
  58 |   await expect(page.locator('text=Booking created')).toBeVisible();
  59 | 
  60 |   // 5. Logout Client
  61 |   await page.click('text=Logout');
  62 |   await page.waitForURL('**/login');
  63 | 
  64 |   // 6. Freelancer Login & Approval
  65 |   await page.goto('/login');
  66 |   await page.fill('#email', freelancerEmail);
  67 |   await page.fill('#password', password);
  68 |   await page.click('button[type="submit"]');
  69 |   await page.waitForURL('**/gigs');
  70 | 
  71 |   await page.goto('/bookings');
  72 |   await page.click(`tr:has-text("${gigTitle}") button:has-text("Approve")`);
  73 |   await expect(page.locator(`tr:has-text("${gigTitle}") >> text=Approved`)).toBeVisible();
  74 | 
  75 |   // 7. Income Verification
  76 |   await page.goto('/income');
  77 |   await expect(page.locator(`text=R${gigPrice}`)).toBeVisible();
  78 | });
```