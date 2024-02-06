//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import { platform } from 'node:os';
import waitForExpect from 'wait-for-expect';

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

  test('join new identity', async () => {
    test.setTimeout(60_000);

    await host.createSpace();
    await host.createSpace();
    await guest.createSpace();

    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(3);
      expect(await guest.getSpaceItemsCount()).to.equal(2);
    });

    // NOTE: Not closing toasts here causes the test to hang.
    await host.closeToasts();
    await guest.closeToasts();

    await host.openIdentityManager();
    const invitationCode = await host.shell.createDeviceInvitation();
    const authCode = await host.shell.getAuthCode();
    await guest.openIdentityManager();
    await guest.shell.joinNewIdentity(invitationCode);
    await guest.shell.authenticateDevice(authCode);
    await host.shell.closeShell();

    // Wait for replication to complete.
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(3);
      expect(await guest.getSpaceItemsCount()).to.equal(3);
    }, 30_000);

    await host.openIdentityManager();
    await guest.openIdentityManager();
    await waitForExpect(async () => {
      expect(await host.shell.getDisplayName()).to.equal(await guest.shell.getDisplayName());
    });
  });
});
