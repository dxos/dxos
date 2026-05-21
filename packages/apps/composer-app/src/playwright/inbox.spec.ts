//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';

if (process.env.DX_PWA !== 'false') {
  throw new Error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
}

const GOOGLE_TEST_EMAIL = 'test@braneframe.com';

test.describe('Inbox plugin', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create mailbox', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Mailbox', name: 'Test Inbox' });

    const plank = host.deck.plank();
    // The mailbox article opens in the deck. With no Gmail integration connected
    // the empty-state warning is displayed.
    await expect(plank.locator.getByText('No integrations configured')).toBeVisible();
    // The connect button must be visible so the user can start the OAuth flow.
    await expect(plank.locator.getByRole('button', { name: /Connect Gmail/i })).toBeVisible();
  });

  test('connect gmail', async ({ browserName }) => {
    // Popup navigation is not reliable in WebKit.
    if (browserName === 'webkit') {
      test.skip(true, 'OAuth popup not supported in WebKit');
    }
    if (!process.env.GOOGLE_TEST_USER_PASSWORD) {
      test.skip(true, 'GOOGLE_TEST_USER_PASSWORD env var not set');
    }

    await host.createSpace();
    await host.createObject({ type: 'Mailbox', name: 'Test Inbox' });

    const plank = host.deck.plank();
    await expect(plank.locator.getByText('No integrations configured')).toBeVisible();

    const connectButton = plank.locator.getByRole('button', { name: /Connect Gmail/i });
    await expect(connectButton).toBeVisible();

    // Open the OAuth popup.
    const popupPromise = host.page.waitForEvent('popup');
    await connectButton.click();
    const popup = await popupPromise;

    // Wait for Google sign-in page to load (relay page first, then redirects to Google).
    await popup.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });

    // Handle "Choose an account" screen if the test account already has a session.
    const chooseAccount = popup.getByText(GOOGLE_TEST_EMAIL);
    const accountVisible = await chooseAccount
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (accountVisible) {
      await chooseAccount.click();
    } else {
      // Email step — Google uses different button IDs across versions; target by role.
      await popup.fill('input[type="email"]', GOOGLE_TEST_EMAIL);
      await popup.getByRole('button', { name: 'Next' }).click();
      await popup.waitForSelector('input[type="password"]', { state: 'visible', timeout: 10_000 });

      // Password step — type character-by-character to trigger Google's change
      // listeners (fill() sets the value directly and may bypass React event handlers).
      const passwordInput = popup.locator('input[type="password"]');
      await passwordInput.click();
      await passwordInput.type(process.env.GOOGLE_TEST_USER_PASSWORD!, { delay: 50 });
      await Promise.all([
        popup.waitForURL((url) => !url.href.includes('/challenge/pwd'), { timeout: 15_000 }),
        passwordInput.press('Enter'),
      ]);
    }

    // Grant access on the OAuth consent screen if it appears.
    const allowButton = popup.getByRole('button', { name: /Allow/i });
    const allowVisible = await allowButton
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (allowVisible) {
      await allowButton.click();
    }

    // Popup closes once Edge has received the token and posted back to the opener.
    await popup.waitForEvent('close', { timeout: 60_000 });

    // After the popup closes the coordinator persists the AccessToken and
    // Integration objects and links the Mailbox as a sync target. Click back on
    // the mailbox to verify it transitioned out of the "no integration" empty state.
    await host.getObjectByName('Test Inbox').click({ delay: 100 });

    await expect(plank.locator.getByText('No integrations configured')).not.toBeVisible({ timeout: 10_000 });
    await expect(plank.locator.getByText('Mailbox empty')).toBeVisible({ timeout: 10_000 });
  });
});
