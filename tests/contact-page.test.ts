
import { test, expect } from '@playwright/test';
import { injectReactTreeUtilsInPage, logFormattedReactTree } from './utils/react-tree';


test('contact page loads correctly on mobile', async ({ page }) => {
  // Set a mobile viewport
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE dimensions

  // Create arrays to store console messages
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  // Listen to console messages and log them immediately
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    } else {
      consoleMessages.push(text);
    }
  });


  // Navigate to the contact page and wait for network to be idle
  await page.goto('http://localhost:3001/contact/adela-reynolds?contact=adonis-windler&group=89a100a7-97ad-4af3-bbd3-f25862981d83', {
    waitUntil: 'networkidle'
  });

  // Wait for key elements to be present
  await page.waitForSelector('[data-testid="back-button"]', { state: 'visible' });

  // Wait for any dynamic content to load
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(injectReactTreeUtilsInPage);
  const treeStr = await page.evaluate(() => window.logFormattedReactTree());
  console.log(treeStr);

  try {
    await logFormattedReactTree(page);

    // Check if we found the contact (look for debug message in console)
    const foundContactMessage = consoleMessages.find(msg =>
      msg.includes('Debug - Found contact:') && msg.includes('adela-reynolds')
    );
    expect(foundContactMessage).toBeTruthy();

    // Log all errors if any were found
    if (consoleErrors.length > 0) {
      console.log('All browser errors:');
      consoleErrors.forEach(error => console.error(error));
    }

    // Check if there are no console errors
    expect(consoleErrors).toHaveLength(0);

    // Verify the contact name is displayed
    const contactName = await page.getByRole('heading', { name: /Adela Reynolds/i });
    await expect(contactName).toBeVisible();

    // Wait for any remaining network activity to complete
    await page.waitForLoadState('networkidle');

    await logFormattedReactTree(page);

    // Verify the back button is present (since we're on mobile)
    const backButton = await page.getByTestId('back-button');
    await expect(backButton).toBeVisible();
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}); 