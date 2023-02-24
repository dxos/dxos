//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { beforeEach, describe, test } from '@dxos/test';

import { InvitationsManager } from './invitations-manager';

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

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });
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

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });
  });
});
