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

  // Navigate to the contact page and wait for network idle
  await page.goto('/contact/adela-reynolds?contact=adonis-windler&group=89a100a7-97ad-4af3-bbd3-f25862981d83', {
    waitUntil: 'networkidle'
  });

  // Wait for the app to be ready
  await page.waitForSelector('[data-testid="contact-pane"]', { state: 'visible' });

  // Inject React tree utils for debugging
  await page.evaluate(injectReactTreeUtilsInPage);
  await logFormattedReactTree(page);

  try {
    // Log all errors if any were found
    if (consoleErrors.length > 0) {
      console.log('All browser errors:');
      consoleErrors.forEach(error => console.error(error));
    }

    // Check if there are no console errors
    expect(consoleErrors).toHaveLength(0);

    // Verify the contact name is displayed
    const contactName = page.getByTestId('contact-name');
    await expect(contactName).toBeVisible();

    // Verify the back button is present (since we're on mobile)
    const backButton = page.getByTestId('back-button');
    await expect(backButton).toBeVisible();

    // Click the back button and verify we return to the contact list
    await backButton.click();
    const contactList = page.getByTestId('contact-list');
    await expect(contactList).toBeVisible();

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}); 