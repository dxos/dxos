//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

// TODO(wittjosiah): Progressive multiplayer broke Kai.
test.describe.skip('Basic test', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeAll(async ({ browser, browserName }) => {
    host = new AppManager(browser);
    await host.init();
    // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
    //   https://github.com/microsoft/playwright/issues/2973
    guest = browserName === 'chromium' ? new AppManager(browser) : host;
    if (browserName === 'chromium') {
      await guest.init();
    }
  });

  test.describe('Default space', () => {
    test('create identity', async () => {
      expect(await host.kaiIsVisible()).to.be.false;

      await host.shell.createIdentity('host');

      // Wait for app to load identity.
      await waitForExpect(async () => {
        expect(await host.kaiIsVisible()).to.be.true;
      }, 1000);
    });

    test('invite guest', async ({ browserName }) => {
      if (browserName !== 'chromium') {
        return;
      }

      await guest.shell.createIdentity('guest');
      const invitationCode = await host.shell.createSpaceInvitation();
      await guest.showSpaceList();
      await guest.openJoinSpace();
      const [authCode] = await Promise.all([
        host.shell.getAuthCode(),
        guest.shell.acceptSpaceInvitation(invitationCode),
      ]);
      await guest.shell.authenticate(authCode);
      await host.shell.closeShell();

      // Wait for redirect.
      await waitForExpect(async () => {
        expect(await host.currentSpace()).to.equal(await guest.currentSpace());
      }, 1000);
    });
  });
});
