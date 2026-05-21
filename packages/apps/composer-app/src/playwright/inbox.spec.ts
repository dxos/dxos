//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

const INBOX_PLUGIN_ID = 'org.dxos.plugin.inbox';
const GOOGLE_TEST_EMAIL = 'test@braneframe.com';

test.describe('Inbox plugin', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
    await host.openPluginRegistry();
    await host.enablePlugin(INBOX_PLUGIN_ID);
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
    if (await chooseAccount.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chooseAccount.click();
    } else {
      // Email step.
      await popup.fill('input[type="email"]', GOOGLE_TEST_EMAIL);
      await popup.click('#identifierNext');
      await popup.waitForSelector('input[type="password"]', { state: 'visible', timeout: 10_000 });

      // Password step.
      await popup.fill('input[type="password"]', process.env.GOOGLE_TEST_USER_PASSWORD!);
      await popup.click('#passwordNext');
    }

    // Grant access on the OAuth consent screen if it appears.
    const allowButton = popup.getByRole('button', { name: /Allow/i });
    if (await allowButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await allowButton.click();
    }

    // Popup closes once Edge has received the token and posted back to the opener.
    await popup.waitForEvent('close', { timeout: 30_000 });

    // After the popup closes the coordinator persists the AccessToken and
    // Integration objects and links the Mailbox as a sync target. Click back on
    // the mailbox to verify it transitioned out of the "no integration" empty state.
    await host.getObjectByName('Test Inbox').click({ delay: 100 });

    await expect(plank.locator.getByText('No integrations configured')).not.toBeVisible({ timeout: 10_000 });
    await expect(plank.locator.getByText('Mailbox empty')).toBeVisible({ timeout: 10_000 });
  });
});
