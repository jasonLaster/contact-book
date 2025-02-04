import { test, expect } from '@playwright/test';
import { injectReactTreeUtilsInPage, logFormattedReactTree } from './utils/react-tree';

test.describe(' Desktop Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to the home page and wait for network idle
    await page.goto('/', {
      waitUntil: 'networkidle'
    });

    // Wait for the app to be ready
    await page.waitForSelector('[data-testid="contact-list"]', { state: 'visible' });

    // Inject React tree utils and log initial tree
    await page.evaluate(injectReactTreeUtilsInPage);
    await logFormattedReactTree(page);
  });

  test('should load and display contact list', async ({ page }) => {
    // Log React tree before checking contact list
    await logFormattedReactTree(page);

    // Verify contact list is visible and contains contacts
    const contactList = page.getByTestId('contact-list');
    await expect(contactList).toBeVisible();

    // Wait for and verify at least one contact item is present
    const contactItems = page.getByTestId('contact-item');
    await expect(contactItems.first()).toBeVisible();

    // Count the number of contacts
    const count = await contactItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should select a contact and display contact details', async ({ page }) => {
    // Log React tree before selecting contact
    await logFormattedReactTree(page);

    // Wait for contact items to be available
    const contactItems = page.getByTestId('contact-item');
    await expect(contactItems.first()).toBeVisible();

    // Get the initial URL
    const initialUrl = page.url();

    // Click the first contact
    await contactItems.first().click();

    // Wait for URL to change and include contact parameter
    await page.waitForURL(url => url.toString().includes('contact='));

    // Log React tree after clicking contact
    await logFormattedReactTree(page);

    // Wait for and verify contact details pane is visible
    const contactPane = page.getByTestId('contact-pane');
    await expect(contactPane).toBeVisible({ timeout: 10000 });

    // Verify contact name is displayed in the details
    const contactName = page.getByTestId('contact-name');
    await expect(contactName).toBeVisible();
  });

  test('should select a group and filter contacts', async ({ page }) => {
    // Log React tree before selecting group
    await logFormattedReactTree(page);

    // Wait for groups sidebar to be visible
    const groupsSidebar = page.getByTestId('groups-sidebar');
    await expect(groupsSidebar).toBeVisible();

    // Get initial contact count
    const initialContactItems = page.getByTestId('contact-item');
    await expect(initialContactItems.first()).toBeVisible();
    const initialCount = await initialContactItems.count();

    // Find and click the first group (excluding "All Contacts")
    const groupItems = page.locator('.w-full.flex.items-center.gap-2.px-2.py-1\\.5.text-sm.rounded-md.hover\\:bg-accent.cursor-pointer').filter({ hasText: /^(?!All Contacts).*$/ });
    await expect(groupItems.first()).toBeVisible();
    await groupItems.first().click();

    // Wait for URL to change and include group parameter
    await page.waitForURL(url => url.toString().includes('group='));

    // Log React tree after clicking group
    await logFormattedReactTree(page);

    // Verify the contact list updates
    const contactList = page.getByTestId('contact-list');
    await expect(contactList).toBeVisible();

    // Wait for the contact list to update
    await page.waitForTimeout(1000); // Give time for the list to update

    // Get filtered contact count
    const filteredContactItems = page.getByTestId('contact-item');
    await expect(filteredContactItems.first()).toBeVisible();
    const filteredCount = await filteredContactItems.count();

    // Verify the filtered list is different from the initial list
    expect(filteredCount).toBeLessThan(initialCount);
  });
}); 