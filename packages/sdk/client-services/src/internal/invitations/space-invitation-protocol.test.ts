//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, chain, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { getCredentialAssertion } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { AlreadyJoinedError } from '@dxos/protocols';
import { fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import {
  Invitation,
  Invitation_AuthMethod,
  Invitation_Kind,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { type ServiceContext, createIdentity, createPeers } from '../testing/index.ts';
import { acceptInvitation, createInvitation, performInvitation } from '../testing/invitation-utils.ts';

const closeAfterTest = async (peer: ServiceContext) => {
  onTestFinished(async () => {
    await peer.close();
  });
  return peer;
};

describe('services/space-invitations-protocol', () => {
  test('genesis', async () => {
    const [peer] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.dataSpaceManager!.createSpace(new Context());
    expect(peer.dataSpaceManager!.spaces.has(space.key)).to.be.true;

    await space.close(new Context());
  });

  test('genesis & ready', async () => {
    const [peer] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));

    const space = await peer.dataSpaceManager!.createSpace(new Context());
    expect(peer.dataSpaceManager!.spaces.has(space.key)).to.be.true;

    await peer.dataSpaceManager?.waitUntilSpaceReady(space.key);
    await space.close(new Context());
  });

  test('a delegated invitation writes the objects it shares beside it', async () => {
    const [host] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(1));
    const space = await host.dataSpaceManager!.createSpace(new Context());
    await host.dataSpaceManager!.waitUntilSpaceReady(space.key);

    const delegate = async (sharedObjectIds?: string[]) =>
      (
        await createInvitation(host, {
          kind: Invitation_Kind.SPACE,
          spaceKey: fromPublicKey(space.key),
          type: Invitation_Type.DELEGATED,
          authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
          multiUse: true,
          sharedObjectIds,
        })
      ).get();
    const scoped = await delegate(['object-1', 'object-2']);
    const unscoped = await delegate();

    const credentialsOf = (
      type: 'dxos.halo.invitations.DelegateSpaceInvitation' | 'dxos.halo.invitations.DelegatedInvitationScope',
    ) => space.inner.spaceState.getCredentialsOfType(type);
    await waitForCondition({
      condition: () => credentialsOf('dxos.halo.invitations.DelegateSpaceInvitation').length === 2,
    });
    const scopes = credentialsOf('dxos.halo.invitations.DelegatedInvitationScope');
    expect(scopes).toHaveLength(1);
    const assertion = getCredentialAssertion(scopes[0]);
    invariant(assertion.$typeName === 'dxos.halo.invitations.DelegatedInvitationScope');
    expect(assertion.invitationId).toBe(scoped.invitationId);
    expect(assertion.invitationId).not.toBe(unscoped.invitationId);
    expect(assertion.objectIds).toEqual(['object-1', 'object-2']);
    // EDGE applies a scope only when the inviter wrote it.
    const [invitationCredential] = credentialsOf('dxos.halo.invitations.DelegateSpaceInvitation');
    expect(toPublicKey(scopes[0].issuer)?.toHex()).toBe(toPublicKey(invitationCredential.issuer)?.toHex());
  });

  test('invitation with no auth', async () => {
    const [host, guest] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const space1 = await host.dataSpaceManager!.createSpace(new Context());
    const spaceKey = space1.key;

    await Promise.all(
      performInvitation({ host, guest, options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(spaceKey) } }),
    );

    {
      const space1 = host.dataSpaceManager!.spaces.get(spaceKey)!;
      const space2 = guest.dataSpaceManager!.spaces.get(spaceKey)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await host.dataSpaceManager?.waitUntilSpaceReady(space1.key);
      await guest.dataSpaceManager?.waitUntilSpaceReady(space2.key);

      await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);

      await space1.close(new Context());
      await space2.close(new Context());
    }
  });

  test('invitation when already joined', async () => {
    const [host, guest] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const space1 = await host.dataSpaceManager!.createSpace(new Context());
    const spaceKey = space1.key;

    await Promise.all(
      performInvitation({ host, guest, options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(spaceKey) } }),
    );

    {
      const space1 = host.dataSpaceManager!.spaces.get(spaceKey)!;
      const space2 = guest.dataSpaceManager!.spaces.get(spaceKey)!;
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;

      await host.dataSpaceManager?.waitUntilSpaceReady(space1.key);
      await guest.dataSpaceManager?.waitUntilSpaceReady(space2.key);
    }

    const [_, guestResult] = performInvitation({
      host,
      guest,
      options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(spaceKey) },
    });

    expect((await guestResult).error).to.be.instanceOf(AlreadyJoinedError);
  });

  test('creates and accepts invitation with retry', async () => {
    const [host, guest] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    let attempt = 0;

    const space1 = await host.dataSpaceManager!.createSpace(new Context());

    const [{ invitation: invitation1, error: error1 }, { invitation: invitation2, error: error2 }] = await Promise.all(
      performInvitation({
        host,
        guest,
        options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(space1.key) },
        hooks: {
          guest: {
            onReady: (invitation) => {
              if (attempt === 0) {
                // Force retry.
                void invitation.authenticate('000000');
                attempt++;
                return true;
              }

              return false;
            },
          },
        },
      }),
    );

    if (error1) {
      throw error1;
    }
    if (error2) {
      throw error2;
    }

    expect(attempt).to.eq(1);
    expect(invitation1?.spaceKey).to.exist;
    expect(invitation2?.spaceKey).to.exist;
    expect(invitation1?.spaceKey).to.deep.eq(invitation2?.spaceKey);

    {
      const hostDataSpaceManager = host.dataSpaceManager ?? raise(new Error('host.dataSpaceManager is not set'));
      const guestDataSpaceManager = guest.dataSpaceManager ?? raise(new Error('guest.dataSpaceManager is not set'));
      const hostSpaceKey = toPublicKey(invitation1?.spaceKey) ?? raise(new Error('invitation1.spaceKey is not set'));
      const guestSpaceKey = toPublicKey(invitation2?.spaceKey) ?? raise(new Error('invitation2.spaceKey is not set'));
      const space1 = hostDataSpaceManager.spaces.get(hostSpaceKey);
      const space2 = guestDataSpaceManager.spaces.get(guestSpaceKey);
      expect(space1).not.to.be.undefined;
      expect(space2).not.to.be.undefined;
      invariant(space1);
      invariant(space2);

      await host.dataSpaceManager?.waitUntilSpaceReady(space1.key);
      await guest.dataSpaceManager?.waitUntilSpaceReady(space2.key);

      await space2.inner.controlPipeline.state.waitUntilTimeframe(space1.inner.controlPipeline.state.timeframe);

      await space1.close(new Context());
      await space2.close(new Context());
    }

    expect(
      guest.identityManager.identity?.space.spaceState.getCredentialsOfType('dxos.halo.credentials.SpaceMember').length,
    ).to.equal(2); // own halo + newly joined space.
  });

  test('timeout', async () => {
    const [host, guest] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));
    const space = await host.dataSpaceManager!.createSpace(new Context());
    const hostInvitation = await createInvitation(host, {
      kind: Invitation_Kind.SPACE,
      spaceKey: fromPublicKey(space.key),
      timeout: 100,
    });
    const invitation = hostInvitation.get();
    await host.close(Context.default());

    const guestTimeout = new Trigger();
    const guestInvitation = await acceptInvitation(guest, invitation);
    guestInvitation.subscribe((invitation) => {
      if (invitation.state === Invitation_State.TIMEOUT) {
        guestTimeout.wake();
      }
    });

    await guestTimeout.wait();
  });

  test('cancels invitation', async () => {
    const [host, guest] = await chain<ServiceContext>([createIdentity, closeAfterTest])(createPeers(2));

    const hostConnected = new Trigger<Invitation>();
    const guestConnected = new Trigger<Invitation>();

    const space1 = await host.dataSpaceManager!.createSpace(new Context());

    const invitationPromises = performInvitation({
      host,
      guest,
      options: { kind: Invitation_Kind.SPACE, spaceKey: fromPublicKey(space1.key) },
      hooks: {
        host: {
          onConnecting: (invitation) => {
            hostConnected.wake(invitation.get());
          },
          onConnected: (invitation) => {
            void invitation.cancel();
            return true;
          },
          onSuccess: () => raise(new Error('invitation success')),
        },
        guest: {
          onConnecting: (invitation) => {
            guestConnected.wake(invitation.get());
          },
        },
      },
    });

    const { swarmKey: swarmKey1 } = await hostConnected.wait();
    const { swarmKey: swarmKey2 } = await guestConnected.wait();
    expect(swarmKey1).to.deep.eq(swarmKey2);

    const [{ invitation: invitation1 }, { error }] = await Promise.all(invitationPromises);
    expect(invitation1?.state).to.eq(Invitation_State.CANCELLED);
    expect(error).to.exist;

    await space1.close(new Context());
  });
});
