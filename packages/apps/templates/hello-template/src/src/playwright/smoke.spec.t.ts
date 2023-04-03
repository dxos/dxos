//
// Copyright 2023 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';

import config from '../../config.t';

export default defineTemplate(
  ({ input: { react } }) => {
    return !react ? null : text /* javascript */ `
    import { expect, test } from '@playwright/test';
    import waitForExpect from 'wait-for-expect';

    import { Invitation } from '@dxos/client';

    import { AppManager } from './app-manager.t';

    const NAME = 'World';

    test.describe('Smoke test', () => {
      let host: AppManager;
      let hostPageTwo: AppManager;
      let guest: AppManager;

      test.beforeAll(async ({ browser }) => {
        host = new AppManager(browser);
        guest = new AppManager(browser);

        await host.init();
        await guest.init();
      });

      test.describe('Default space', () => {
        test('create identity', async () => {
          await host.login();
          await host.shell.createIdentity(NAME);

          // Wait for sync between windows.
          await waitForExpect(async () => {
            expect(await host.isCounterVisible()).toBeTruthy();
            expect(await host.isHelloVisible(NAME)).toBeTruthy();
          }, 100);
        });

        test('increment counter', async () => {
          // Cannot be setup in beforeAll because \`useOrCreateFirstSpace\` will create two spaces if two pages are open.
          hostPageTwo = new AppManager(host.context);
          await hostPageTwo.init();

          expect(await hostPageTwo.isCounterVisible()).toBeTruthy();
          expect(await hostPageTwo.isHelloVisible(NAME)).toBeTruthy();
          expect(await host.currentCount()).toBe(0);

          await hostPageTwo.increment();

          // Wait for sync between windows.
          await waitForExpect(async () => {
            expect(await host.currentCount()).toBe(1);
          }, 100);
        });

        test('invite new device', async () => {
          const invitationCode = await host.shell.createInvitation(Invitation.Kind.DEVICE);
          await guest.login();
          await guest.shell.joinIdentity();
          const [authCode] = await Promise.all([
            host.shell.getAuthCode(),
            guest.shell.acceptInvitation(invitationCode, Invitation.Kind.DEVICE)
          ]);
          await guest.shell.authenticate(authCode, Invitation.Kind.DEVICE);
          await host.shell.closeShell();

          // Wait for sync between devices.
          await waitForExpect(async () => {
            expect(await guest.isCounterVisible()).toBeTruthy();
            expect(await guest.isHelloVisible(NAME)).toBeTruthy();
          }, 500);

          // TODO(wittjosiah): Currently \`useOrCreateFirstSpace\` is not aware of spaces from other devices.
          await guest.page.reload();
          expect(await guest.currentCount()).toBe(1);
        });
      });
    });
    `;
  },
  { config }
);

