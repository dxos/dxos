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
    test('app loads', async () => {
      await host.init();
      await host.createIdentity('host');
      expect(await host.kaiIsVisible()).to.be.true;
    });

    test('invite guest', async () => {
      await guest.init();
      await guest.createIdentity('guest');
      const invitationCode = await host.shareSpace();
      const [authenticationCode] = await Promise.all([host.getAuthenticationCode(), guest.joinSpace(invitationCode)]);
      await guest.authenticate(authenticationCode);

      // Wait for redirect.
      await waitForExpect(async () => {
        expect(await host.currentSpace()).to.equal(await guest.currentSpace());
      }, 1000);
    }).onlyEnvironments('chromium');
  });
});
