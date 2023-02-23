//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { beforeAll, describe, test } from '@dxos/test';

import { AppManager } from './app-manager';

describe('Basic test', () => {
  let host: AppManager;
  let guest: AppManager;

  beforeAll(function () {
    host = new AppManager(this);
    // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
    //   https://github.com/microsoft/playwright/issues/2973
    guest = mochaExecutor.environment === 'chromium' ? new AppManager(this) : host;
  });

  describe('Default space', () => {
    test('create identity', async () => {
      await host.init();

      expect(await host.kaiIsVisible()).to.be.false;

      await host.shell.createIdentity('host');

      // Wait for app to load identity.
      await waitForExpect(async () => {
        expect(await host.kaiIsVisible()).to.be.true;
      }, 1000);
    }).skipEnvironments('firefox');

    test('invite guest', async () => {
      await guest.init();
      await guest.shell.createIdentity('guest');
      const invitationCode = await host.shell.createSpaceInvitation();
      const [authenticationCode] = await Promise.all([
        host.shell.getAuthenticationCode(),
        guest.shell.acceptSpaceInvitation(invitationCode)
      ]);
      await guest.shell.authenticate(authenticationCode);
      await host.shell.closeShell();

      // Wait for redirect.
      await waitForExpect(async () => {
        expect(await host.currentSpace()).to.equal(await guest.currentSpace());
      }, 1000);
    }).onlyEnvironments('chromium');
  });
});
