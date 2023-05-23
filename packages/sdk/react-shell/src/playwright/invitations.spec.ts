//
// Copyright 2021 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { ConnectionState, Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { InvitationsManager } from './invitations-manager';

test.describe('Invitations', () => {
  let manager: InvitationsManager;

  // TODO(wittjosiah): Storybook takes a bit to be ready for testing against.
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    manager = new InvitationsManager(browser);
    await manager.init();
  });

  test.beforeEach(async ({ browser }) => {
    manager = new InvitationsManager(browser);
    await manager.init();
  });

  test.describe('device', () => {
    test('happy path', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.acceptInvitation(1, 'device', invitation)]);
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('no auth method', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device', { authMethod: Invitation.AuthMethod.NONE });

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('invalid & retry auth code', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.acceptInvitation(1, 'device', invitation)]);
      await manager.authenticateInvitation('device', '000000', manager.peer(1));
      await manager.clearAuthCode('device', manager.peer(1));
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('invalid & max auth code retries reached, retry invitation', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);

      await manager.authenticateInvitation('device', '000001', manager.peer(1));
      await manager.clearAuthCode('device', manager.peer(1));
      await manager.authenticateInvitation('device', '000002', manager.peer(1));
      await manager.clearAuthCode('device', manager.peer(1));
      await manager.authenticateInvitation('device', '000003', manager.peer(1));

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;

      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('device', manager.peer(1));

      const [authCode] = await Promise.all([manager.getAuthCode(), manager.clearAuthCode('device', manager.peer(1))]);

      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('invitation timeout', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device', { timeout: 10 });

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;
    });

    test('invitation cancelled by host', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      expect(await manager.readyToAuthenticate('device', manager.peer(1))).to.be.true;
      await manager.cancelInvitation('device', 'host', manager.peer(0));

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;
    });

    test('invitation cancelled by guest & retry', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.cancelInvitation('device', 'guest', manager.peer(1));
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('device', manager.peer(1));
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.clearAuthCode('device', manager.peer(1))]);
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('recover from network failure during invitation', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      expect(await manager.readyToAuthenticate('device', manager.peer(1))).to.be.true;
      await manager.toggleNetworkStatus(0);
      expect(await manager.getNetworkStatus(0)).to.equal(ConnectionState.OFFLINE);
      await manager.toggleNetworkStatus(0);
      expect(await manager.getNetworkStatus(0)).to.equal(ConnectionState.ONLINE);
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('device', manager.peer(1));
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.clearAuthCode('device', manager.peer(1))]);
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('multiple concurrent invitations', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      await manager.openPanel(1, 'identity');
      await manager.openPanel(2, 'identity');

      // TODO(wittjosiah): Improve auth code fetching to make it easier to disambiguate them.
      const invitation1 = await manager.createInvitation(0, 'device');
      const [authCode1] = await Promise.all([
        manager.getAuthCode(),
        manager.acceptInvitation(1, 'device', invitation1),
      ]);

      const invitation2 = await manager.createInvitation(0, 'device');
      const [authCode2] = await Promise.all([
        manager.getAuthCode(),
        manager.acceptInvitation(2, 'device', invitation2),
      ]);

      await manager.authenticateInvitation('device', authCode1, manager.peer(1));
      // TODO(wittjosiah): Managing focus in tests is flaky.
      // Helps to ensure both auth codes are fully input (especially in webkit).
      await sleep(100);
      await manager.authenticateInvitation('device', authCode2, manager.peer(2));
      await manager.doneInvitation('device', manager.peer(1));
      await manager.doneInvitation('device', manager.peer(2));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(2));
      expect(await manager.getDisplayName(1)).to.equal(await manager.getDisplayName(2));
    });
  });

  test.describe('space', () => {
    test('happy path', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.acceptInvitation(1, 'space', invitation)]);
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('no auth method', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space', { authMethod: Invitation.AuthMethod.NONE });

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('invalid & retry auth code', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.acceptInvitation(1, 'space', invitation)]);
      await manager.authenticateInvitation('space', '000000', manager.peer(1));

      expect(await manager.authenticatorIsVisible('space', manager.peer(1))).to.be.true;

      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('invalid & max auth code retries reached, retry invitation', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);

      await manager.authenticateInvitation('space', '000001', manager.peer(1));
      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', '000002', manager.peer(1));
      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', '000003', manager.peer(1));

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;

      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('space', manager.peer(1));

      const [authCode] = await Promise.all([manager.getAuthCode(), manager.clearAuthCode('space', manager.peer(1))]);

      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('invitation timeout', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space', { timeout: 10 });

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;
    });

    test('invitation cancelled by host', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      expect(await manager.readyToAuthenticate('space', manager.peer(1))).to.be.true;
      await manager.cancelInvitation('space', 'host', manager.peer(0));

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;
    });

    test('invitation cancelled by guest & retry', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.cancelInvitation('space', 'guest', manager.peer(1));
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('space', manager.peer(1));

      const [authCode] = await Promise.all([manager.getAuthCode(), manager.clearAuthCode('space', manager.peer(1))]);

      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('recover from network failure during invitation', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      const invitation = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      expect(await manager.readyToAuthenticate('space', manager.peer(1))).to.be.true;
      await manager.toggleNetworkStatus(0);
      expect(await manager.getNetworkStatus(0)).to.equal(ConnectionState.OFFLINE);
      await manager.toggleNetworkStatus(0);
      expect(await manager.getNetworkStatus(0)).to.equal(ConnectionState.ONLINE);
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('space', manager.peer(1));
      const [authCode] = await Promise.all([manager.getAuthCode(), manager.clearAuthCode('space', manager.peer(1))]);
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
    });

    test('multiple concurrent invitations', async () => {
      test.slow();

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createIdentity(2);

      await manager.createSpace(0);
      await manager.openPanel(0, 0);
      await manager.openPanel(1, 'join');
      await manager.openPanel(2, 'join');

      const invitation1 = await manager.createInvitation(0, 'space');
      const [authCode1] = await Promise.all([manager.getAuthCode(), manager.acceptInvitation(1, 'space', invitation1)]);

      const invitation2 = await manager.createInvitation(0, 'space');
      const [authCode2] = await Promise.all([manager.getAuthCode(), manager.acceptInvitation(2, 'space', invitation2)]);

      await manager.authenticateInvitation('space', authCode1, manager.peer(1));
      // Helps to ensure both auth codes are fully input (especially in webkit).
      await sleep(100);
      await manager.authenticateInvitation('space', authCode2, manager.peer(2));
      await manager.doneInvitation('space', manager.peer(1));
      await manager.doneInvitation('space', manager.peer(2));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(1, 0));
      expect(await manager.getSpaceName(0, 0)).to.equal(await manager.getSpaceName(2, 0));
      expect(await manager.getSpaceName(1, 0)).to.equal(await manager.getSpaceName(2, 0));
    });
  });
});
