//
// Copyright 2021 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { Invitation } from '@dxos/react-client/invitations';
import { ConnectionState } from '@dxos/react-client/mesh';

import { InvitationsManager } from './invitations-manager';

test.describe('Invitations', () => {
  let manager: InvitationsManager;

  // TODO(wittjosiah): Storybook takes a bit to be ready for testing against.
  test.beforeAll(async ({ browser, browserName }) => {
    // TODO(wittjosiah): Storybook is broken in Safari/Webkit.
    test.skip(browserName === 'webkit');
    test.setTimeout(60_000);
    manager = new InvitationsManager(browser);
    await manager.init();
  });

  test.beforeEach(async ({ browser }) => {
    test.slow();

    manager = new InvitationsManager(browser);
    await manager.init();
  });

  test.describe('device', () => {
    test('happy path', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.readyToAuthenticate('device', manager.peer(1));
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
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.authenticateInvitation('device', '000000', manager.peer(1));
      await manager.clearAuthCode('device', manager.peer(1));
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    test('invalid & max auth code retries reached, retry invitation', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');
      const authCode = await manager.getAuthCode();

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
      await manager.clearAuthCode('device', manager.peer(1));
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

    // TODO(thure): This is skipped because the UI no longer affords cancelling device invitations, consider removing.
    // TODO(wittjosiah): Device invitations are cancelled when leaving the invitation pane, this test should be fixed.
    test.skip('invitation cancelled by host', async () => {
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
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.cancelInvitation('device', 'guest', manager.peer(1));
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('device', manager.peer(1));
      await manager.clearAuthCode('device', manager.peer(1));
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });

    // TODO(thure): The design no longer affords signalling an identity’s network status. Remove or adjust test, or adjust design.
    test.skip('recover from network failure during invitation', async () => {
      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      expect(await manager.readyToAuthenticate('device', manager.peer(1))).to.be.true;
      await manager.toggleNetworkStatus(0);
      expect(await manager.getNetworkStatus(0)).to.equal(ConnectionState.OFFLINE);
      await manager.toggleNetworkStatus(0);
      expect(await manager.getNetworkStatus(0)).to.equal(ConnectionState.ONLINE);
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('device', manager.peer(1));
      await manager.clearAuthCode('device', manager.peer(1));
      await manager.authenticateInvitation('device', authCode, manager.peer(1));
      await manager.doneInvitation('device', manager.peer(1));

      expect(await manager.getDisplayName(0)).to.equal(await manager.getDisplayName(1));
    });
  });

  test.describe('space', () => {
    test('happy path', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.readyToAuthenticate('space', manager.peer(1));
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
    });

    test('already joined', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation1 = await manager.createInvitation(0, 'space', { authMethod: Invitation.AuthMethod.NONE });
      const invitation2 = await manager.createInvitation(0, 'space');

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation1);
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation2);
      await manager.doneInvitation('space', manager.peer(1));

      expect(await manager.getSpaceMembersCount(0)).to.equal(2);
    });

    test('no auth method', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space', { authMethod: Invitation.AuthMethod.NONE });

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
    });

    test('invalid & retry auth code', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.authenticateInvitation('space', '000000', manager.peer(1));

      expect(await manager.authenticatorIsVisible('space', manager.peer(1))).to.be.true;

      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
    });

    test('invalid & max auth code retries reached, retry invitation', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

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
      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
    });

    test('invitation timeout', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space', { timeout: 10 });

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);

      expect(await manager.invitationFailed(manager.peer(1))).to.be.true;
    });

    // TODO(wittjosiah): Cancel not propagating.
    test.skip('invitation cancelled by host', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
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
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

      await manager.createIdentity(1);
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.cancelInvitation('space', 'guest', manager.peer(1));
      await manager.resetInvitation(manager.peer(1));
      await manager.invitationInputContinue('space', manager.peer(1));
      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
    });

    // TODO(thure): The design no longer affords signalling an identity’s network status. Remove or adjust test, or adjust design.
    test.skip('recover from network failure during invitation', async () => {
      await manager.createIdentity(0);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

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
      await manager.clearAuthCode('space', manager.peer(1));
      await manager.authenticateInvitation('space', authCode, manager.peer(1));
      await manager.doneInvitation('space', manager.peer(1));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
    });

    test('multiple concurrent invitations', async () => {
      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createIdentity(2);

      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      await manager.openPanel(1, 'join');
      await manager.openPanel(2, 'join');

      const invitation1 = await manager.createInvitation(0, 'space');
      const authCode1 = await manager.getAuthCode();
      await manager.acceptInvitation(1, 'space', invitation1);
      await manager.readyToAuthenticate('space', manager.peer(1));

      const invitation2 = await manager.createInvitation(0, 'space');
      const authCode2 = await manager.getAuthCode();
      await manager.acceptInvitation(2, 'space', invitation2);
      await manager.readyToAuthenticate('space', manager.peer(2));

      await manager.authenticateInvitation('space', authCode1, manager.peer(1));
      // TODO(wittjosiah): Managing focus in tests is flaky.
      // Helps to ensure both auth codes are fully input (especially in webkit).
      await sleep(100);
      await manager.authenticateInvitation('space', authCode2, manager.peer(2));
      await manager.doneInvitation('space', manager.peer(1));
      await manager.doneInvitation('space', manager.peer(2));

      await manager.openPanel(0, 'spaces');
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(1, 1));
      expect(await manager.getSpaceName(0, 1)).to.equal(await manager.getSpaceName(2, 1));
      expect(await manager.getSpaceName(1, 1)).to.equal(await manager.getSpaceName(2, 1));
    });
  });
});
