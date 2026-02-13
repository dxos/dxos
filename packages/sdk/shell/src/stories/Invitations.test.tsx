//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { Invitation_AuthMethod } from '@dxos/react-client/invitations';

import { InvitationsTestManager } from '../testing';

import * as stories from './Invitations.stories';

const { Default } = composeStories(stories);

describe('Invitations', () => {
  let manager: InvitationsTestManager;

  afterEach(() => {
    manager?.dispose();
    cleanup();
  });

  describe('device', () => {
    test('happy path', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.readyToAuthenticate('device', 1);
      await manager.authenticateInvitation('device', authCode, 1);

      const displayName0 = await manager.waitForDisplayName(0);
      const displayName1 = await manager.waitForDisplayName(1);
      expect(displayName0).toBeTruthy();
      expect(displayName1).toBeTruthy();
      const name0 = displayName0.replace(/^[^\w]+/, '').trim();
      const name1 = displayName1.replace(/^[^\w]+/, '').trim();
      expect(name0).toEqual(name1);
    });

    test('no auth method', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device', {
        authMethod: Invitation_AuthMethod.NONE,
      });

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);

      const displayName0 = await manager.waitForDisplayName(0);
      const displayName1 = await manager.waitForDisplayName(1);
      expect(displayName0).toBeTruthy();
      expect(displayName1).toBeTruthy();
      const name0 = displayName0.replace(/^[^\w]+/, '').trim();
      const name1 = displayName1.replace(/^[^\w]+/, '').trim();
      expect(name0).toEqual(name1);
    });

    test('invalid & retry auth code', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);
      await manager.readyToAuthenticate('device', 1);

      // Enter invalid code.
      await manager.authenticateInvitation('device', '000000', 1);

      // Wait for validation to fail and input to be ready again.
      await manager.waitForAuthRetry('device', 1);
      await manager.clearAuthCode('device', 1);
      await manager.authenticateInvitation('device', authCode, 1);

      const displayName0 = await manager.waitForDisplayName(0);
      const displayName1 = await manager.waitForDisplayName(1);
      expect(displayName0).toBeTruthy();
      expect(displayName1).toBeTruthy();
      const name0 = displayName0.replace(/^[^\w]+/, '').trim();
      const name1 = displayName1.replace(/^[^\w]+/, '').trim();
      expect(name0).toEqual(name1);
    }, 30000);

    // TODO(wittjosiah): Remove? This seems to invalidate the invitation now.
    test.todo('invalid & max auth code retries reached, retry invitation');

    test('invitation timeout', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.openPanel(0, 'devices');
      const invitation = await manager.createInvitation(0, 'device', { timeout: 10 });

      await manager.openPanel(1, 'identity');
      await manager.acceptInvitation(1, 'device', invitation);

      expect(await manager.invitationFailed(1)).toBe(true);
    });

    // TODO(thure): This is skipped because the UI no longer affords cancelling device invitations.
    test.todo('invitation cancelled by host');

    // TODO(wittjosiah): Remove? This seems to invalidate the invitation now.
    test.todo('invitation cancelled by guest & retry');

    // TODO(thure): The design no longer affords signalling an identity's network status.
    test.todo('recover from network failure during invitation');
  });

  describe('space', () => {
    test('happy path', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.readyToAuthenticate('space', 1);
      await manager.authenticateInvitation('space', authCode, 1);

      await manager.openPanel(0, 'spaces');
      const spaceName0 = await manager.waitForSpaceName(0, 1);
      expect(spaceName0).toBeTruthy();
      await manager.waitForSpaceToAppear(1, spaceName0!);
    });

    test('already joined', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);

      // First invitation with no auth.
      const invitation1 = await manager.createInvitation(0, 'space', {
        authMethod: Invitation_AuthMethod.NONE,
      });
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation1);

      // Wait for space to appear on peer 1.
      await manager.openPanel(0, 'spaces');
      const spaceName0 = await manager.waitForSpaceName(0, 1);
      await manager.waitForSpaceToAppear(1, spaceName0!);

      // Second invitation - peer 1 should already be a member.
      await manager.openPanel(0, 1);
      const invitation2 = await manager.createInvitation(0, 'space');
      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation2);

      // Verify peer 0 still has 2 members (host + peer 1).
      const memberCount = await manager.getSpaceMembersCount(0);
      expect(memberCount).toEqual(2);
    });

    test('no auth method', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space', {
        authMethod: Invitation_AuthMethod.NONE,
      });

      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);

      await manager.openPanel(0, 'spaces');
      const spaceName0 = await manager.waitForSpaceName(0, 1);
      expect(spaceName0).toBeTruthy();
      await manager.waitForSpaceToAppear(1, spaceName0!);
    });

    test('invalid & retry auth code', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space');
      const authCode = await manager.getAuthCode();

      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);
      await manager.readyToAuthenticate('space', 1);

      // Enter invalid code.
      await manager.authenticateInvitation('space', '000000', 1);

      // Authenticator should still be visible after failure.
      expect(await manager.authenticatorIsVisible('space', 1)).toBe(true);

      // Wait for validation to fail and input to be ready again.
      await manager.waitForAuthRetry('space', 1);
      await manager.clearAuthCode('space', 1);
      await manager.authenticateInvitation('space', authCode, 1);

      await manager.openPanel(0, 'spaces');
      const spaceName0 = await manager.waitForSpaceName(0, 1);
      expect(spaceName0).toBeTruthy();
      await manager.waitForSpaceToAppear(1, spaceName0!);
    }, 30000);

    // TODO(wittjosiah): Remove? This seems to invalidate the invitation now.
    test.todo('invalid & max auth code retries reached, retry invitation');

    test('invitation timeout', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      const invitation = await manager.createInvitation(0, 'space', { timeout: 10 });

      await manager.openPanel(1, 'join');
      await manager.acceptInvitation(1, 'space', invitation);

      expect(await manager.invitationFailed(1)).toBe(true);
    });

    // TODO(wittjosiah): Cancel not propagating.
    test.todo('invitation cancelled by host');

    // TODO(wittjosiah): Remove? This seems to invalidate the invitation now.
    test.todo('invitation cancelled by guest & retry');

    // TODO(thure): The design no longer affords signalling an identity's network status.
    test.todo('recover from network failure during invitation');

    test('multiple concurrent invitations', async () => {
      manager = new InvitationsTestManager();
      await Default.run();
      await manager.waitForPeers(3);

      await manager.createIdentity(0);
      await manager.createIdentity(1);
      await manager.createIdentity(2);

      await manager.createSpace(0);
      await manager.openPanel(0, 1);
      await manager.openPanel(1, 'join');
      await manager.openPanel(2, 'join');

      // Create first invitation and have peer 1 accept it.
      const invitation1 = await manager.createInvitation(0, 'space');
      const authCode1 = await manager.getAuthCode();
      await manager.acceptInvitation(1, 'space', invitation1);
      await manager.readyToAuthenticate('space', 1);

      // Create second invitation and have peer 2 accept it.
      const invitation2 = await manager.createInvitation(0, 'space');
      const authCode2 = await manager.getAuthCode();
      await manager.acceptInvitation(2, 'space', invitation2);
      await manager.readyToAuthenticate('space', 2);

      // Authenticate both.
      await manager.authenticateInvitation('space', authCode1, 1);
      await manager.authenticateInvitation('space', authCode2, 2);

      // Verify all peers have the same space.
      await manager.openPanel(0, 'spaces');
      const spaceName0 = await manager.waitForSpaceName(0, 1);
      expect(spaceName0).toBeTruthy();
      await manager.waitForSpaceToAppear(1, spaceName0!);
      await manager.waitForSpaceToAppear(2, spaceName0!);
    });
  });
});
