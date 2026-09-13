//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager.ts';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

/**
 * Single-device half of the settings sync; the cross-device half is covered by `halo.spec.ts`.
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
    // Playwright runs `afterEach` even when `beforeEach` skipped, so the manager may not exist.
    if (host !== undefined) {
      await host.close();
    }
  });

  test('a device-local change leaves the account value intact', async () => {
    test.setTimeout(120_000);

    const shared = 'http://localhost:3001';
    const local = 'http://localhost:3002';

    await host.openPluginSettings('org.dxos.plugin.registry');
    await host.getDevPluginUrlInput().fill(shared);
    await expect(host.getDevPluginUrlInput()).toHaveValue(shared);

    await host.useSettingsForThisDeviceOnly();

    // Unsynced, so this edit is recorded against the device instead of the account.
    await host.getDevPluginUrlInput().fill(local);
    await expect(host.getDevPluginUrlInput()).toHaveValue(local);

    // Rejoining drops the device's copy; the account's value comes back only if the local edit
    // never reached the shared layer.
    await host.rejoinAccountSettings();
    await expect(host.getDevPluginUrlInput()).toHaveValue(shared, { timeout: 30_000 });
  });
});
