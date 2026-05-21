//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

const INBOX_PLUGIN_ID = 'org.dxos.plugin.inbox';

/**
 * Intercepts the Edge OAuth initiation request and the resulting popup page,
 * completing the OAuth flow immediately with the provided access token instead
 * of redirecting to Google.
 *
 * How it works:
 * 1. Routes POST **/oauth/initiate → returns a synthetic authUrl at the same
 *    Edge origin, carrying accessTokenId + accessToken as query params.
 * 2. Routes GET **/oauth-test-stub → serves HTML that posts the result back to
 *    window.opener. The message's event.origin equals the Edge origin, so it
 *    passes the coordinator's origin check.
 */
const setupOAuthSimulation = async (page: Page, accessToken: string): Promise<void> => {
  await page.context().route('**/oauth/initiate', async (route) => {
    const edgeOrigin = new URL(route.request().url()).origin;
    const body = JSON.parse(route.request().postData() ?? '{}') as { accessTokenId?: string };
    const accessTokenId = body.accessTokenId ?? '';

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          authUrl: `${edgeOrigin}/oauth-test-stub?accessTokenId=${encodeURIComponent(accessTokenId)}&accessToken=${encodeURIComponent(accessToken)}`,
        },
      }),
    });
  });

  await page.context().route('**/oauth-test-stub*', async (route) => {
    const url = new URL(route.request().url());
    const payload = JSON.stringify({
      success: true,
      accessTokenId: url.searchParams.get('accessTokenId') ?? '',
      accessToken: url.searchParams.get('accessToken') ?? '',
    });

    await route.fulfill({
      contentType: 'text/html',
      body: `<!DOCTYPE html><html><body><script>
        window.opener?.postMessage(${payload}, '*');
        setTimeout(() => window.close(), 200);
      </script></body></html>`,
    });
  });
};

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
    // Popup interception is not reliable in WebKit.
    if (browserName === 'webkit') {
      test.skip(true, 'OAuth popup interception not supported in WebKit');
    }
    if (!process.env.GOOGLE_ACCESS_TOKEN) {
      test.skip(true, 'GOOGLE_ACCESS_TOKEN env var not set');
    }

    // Intercept the Edge OAuth flow so no browser popup to Google is needed.
    await setupOAuthSimulation(host.page, process.env.GOOGLE_ACCESS_TOKEN!);

    await host.createSpace();
    await host.createObject({ type: 'Mailbox', name: 'Test Inbox' });

    const plank = host.deck.plank();
    await expect(plank.locator.getByText('No integrations configured')).toBeVisible();

    const connectButton = plank.locator.getByRole('button', { name: /Connect Gmail/i });
    await expect(connectButton).toBeVisible();

    // Click "Connect Gmail". The integration coordinator opens a popup pointing
    // at the synthetic OAuth URL. Our stub page immediately posts the result
    // back to window.opener and closes the popup.
    const popupPromise = host.page.waitForEvent('popup');
    await connectButton.click();
    const popup = await popupPromise;
    await popup.waitForEvent('close', { timeout: 10_000 });

    // After the popup closes the coordinator persists the AccessToken and
    // Integration objects, links the Mailbox as a sync target, and navigates
    // the deck to show the new Integration. Click back on the mailbox to verify
    // it transitioned out of the "no integration" empty state.
    await host.getObjectByName('Test Inbox').click({ delay: 100 });

    await expect(plank.locator.getByText('No integrations configured')).not.toBeVisible({ timeout: 5_000 });
    await expect(plank.locator.getByText('Mailbox empty')).toBeVisible({ timeout: 5_000 });
  });
});
