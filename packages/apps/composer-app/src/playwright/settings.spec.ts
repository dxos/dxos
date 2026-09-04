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

/**
 * Settings live in the settings space and are shared across a user's devices, with a per-panel
 * control that keeps one device on its own values.
 *
 * The cross-device half needs two devices on one identity and is covered by `halo.spec.ts`. What a
 * single device can still prove is the layering underneath: a device-local edit must leave the
 * account's value intact, which is only observable by rejoining and watching it come back.
 */
test.describe('Settings sync', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium');
    host = new AppManager(browser, false);
    await host.init();
    await host.waitForDefaultWorkspace();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('a device-local change leaves the account value intact', async () => {
    test.setTimeout(120_000);

    const shared = 'http://localhost:3001';
    const local = 'http://localhost:3002';

    // The registry's dev-plugin URL is an ordinary synced plugin setting.
    await host.openPluginSettings('org.dxos.plugin.registry', host.getDevPluginUrlInput());
    await host.getDevPluginUrlInput().fill(shared);
    await expect(host.getDevPluginUrlInput()).toHaveValue(shared);

    // The control only renders once the settings space is open, so reaching it at all is the proof
    // that the sync activated against a real profile.
    await host.useSettingsForThisDeviceOnly();

    // Unsynced, so this edit is recorded against the device instead of the account.
    await host.getDevPluginUrlInput().fill(local);
    await expect(host.getDevPluginUrlInput()).toHaveValue(local);

    // Rejoining drops the device's copy. The account's value coming back is the assertion that
    // matters — it could only survive if the local edit never reached the shared layer.
    await host.rejoinAccountSettings();
    await expect(host.getDevPluginUrlInput()).toHaveValue(shared, { timeout: 30_000 });
  });
});
