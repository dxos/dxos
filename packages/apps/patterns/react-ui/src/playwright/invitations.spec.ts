//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { beforeEach, describe, test } from '@dxos/test';

import { InvitationsManager } from './invitations-manager';

/** TODO(wittjosiah): Test cases.
 * no auth code
 * invalid auth code + retry success
 * invalid auth code + max retries reached
 * invitation timeout + retry success
 * invitation cancelled by host
 * invitation cancelled by guest
 * network/signal failure/not available
 * multiple concurrent invitations
 */

describe('Invitations', () => {
  let manager: InvitationsManager;

  beforeEach(async function () {
    manager = new InvitationsManager(this);
    await manager.init();
  });

  describe('device', () => {
    test('happy path', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      const [authenticationCode] = await Promise.all([
        manager.getAuthenticationCode(),
        manager.acceptInvitation(1, 'device', invitation)
      ]);
      await manager.authenticateInvitation(1, 'device', authenticationCode);
      await manager.doneInvitation(1, 'device');

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    // TODO(wittjosiah): Auth method not hooked up?
    test.skip('no auth method', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device', { authMethod: AuthMethod.NONE });

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.doneInvitation(1, 'device');

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('invalid auth code + retry success', async () => {});
    test('invalid auth code + max retries reached', async () => {});
    test('invitation timeout + retry success', async () => {});
    test('invitation cancelled by host', async () => {});
    test('invitation cancelled by guest', async () => {});
    test('network failure', async () => {});
    test('multiple concurrent invitations', async () => {});
  });

  describe('space', () => {
    test('happy path', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      const [authenticationCode] = await Promise.all([
        manager.getAuthenticationCode(),
        manager.acceptInvitation(1, 'space', invitation)
      ]);
      await manager.authenticateInvitation(1, 'space', authenticationCode);
      await manager.doneInvitation(1, 'space');

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('no auth method', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space', { authMethod: AuthMethod.NONE });

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.doneInvitation(1, 'space');

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('invalid auth code + retry success', async () => {});
    test('invalid auth code + max retries reached', async () => {});
    test('invitation timeout + retry success', async () => {});
    test('invitation cancelled by host', async () => {});
    test('invitation cancelled by guest', async () => {});
    test('network failure', async () => {});
    test('multiple concurrent invitations', async () => {});
  });
});
