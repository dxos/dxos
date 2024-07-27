//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';
import { platform } from 'node:os';

import { AppManager } from './app-manager';

// TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
//   https://github.com/microsoft/playwright/issues/2973
test.describe('HALO tests', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox');
    test.skip(browserName === 'webkit' && platform() !== 'darwin');

    host = new AppManager(browser, true);
    guest = new AppManager(browser, true);

    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    // NOTE: `afterEach` even if the test is skipped in the beforeEach!
    // Guard against uninitialized app managers.
    if (host !== undefined || guest !== undefined) {
      await host.closePage();
      await guest.closePage();
    }
  });

  test('join new identity', async () => {
    test.setTimeout(60_000);

    await host.createSpace();

    await expect(host.getSpaceItems()).toHaveCount(2);
    await expect(guest.getSpaceItems()).toHaveCount(1);

    await host.openIdentityManager();
    const invitationCode = await host.shell.createDeviceInvitation();
    const authCode = await host.shell.getAuthCode();
    await guest.openIdentityManager();
    await guest.shell.joinNewIdentity(invitationCode);
    await guest.shell.authenticateDevice(authCode);
    await host.shell.closeShell();

    await expect(host.getSpaceItems()).toHaveCount(2);
    // Wait for replication to complete.
    await expect(guest.getSpaceItems()).toHaveCount(2, { timeout: 30_000 });

    // TODO(wittjosiah): Display name is not currently set in this test.
    // await host.openIdentityManager();
    // await guest.openIdentityManager();
    // await waitForExpect(async () => {
    //   expect(await host.shell.getDisplayName()).to.equal(await guest.shell.getDisplayName());
    // });
  });
});
