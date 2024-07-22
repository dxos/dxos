//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { sleep, Trigger } from '@dxos/async';
import { performInvitation } from '@dxos/client-services/testing';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { Invitation, QueryInvitationsResponse } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { type Client } from '../client';
import { createInitializedClientsWithContext, testSpaceAutomerge, waitForSpace } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const [client1, client2] = await createInitializedClients(2);

    log('initialized');

    const space1 = await client1.spaces.create();
    log('spaces.create', { key: space1.key });
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1, guest: client2.spaces }),
    );
    expect(guestInvitation?.spaceKey).to.deep.eq(space1.key);
    expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

    {
      const space = await waitForSpace(client2, guestInvitation!.spaceKey!, { ready: true });
      await testSpaceAutomerge(space.db);
    }
  });

  describe('delegated', () => {
    test('single-use', async () => {
      const clients = await createInitializedClients(3);
      const [alice, bob, fred] = clients;

      // Alice invites Bob.
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
      expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

      // Alice creates a delegated invitation.
      const bobInvitations = createInvitationTracker(bob);
      const observableInvitation = space.share({
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: false,
      });
      await bobInvitations.waitForInvitation(observableInvitation.get());
      // Alice leaves.
      await alice.destroy();
      // Bob admits Fred.
      const fredInvitations = createInvitationTracker(fred);
      fred.spaces.join(observableInvitation.get());
      await waitForSpace(fred, space.key!, { ready: true });
      // Invitation gets disposed.
      await bobInvitations.waitEmpty();
      // Fred sees disposal as well.
      await sleep(20);
      await fredInvitations.waitEmpty();
    });

    test('multi-use', async () => {
      const clients = await createInitializedClients(4);
      const [alice, bob, fred, charlie] = clients;

      // Alice invites Bob.
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
      expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

      // Alice creates a delegated invitation.
      const bobInvitations = createInvitationTracker(bob);
      const observableInvitation = space.share({
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: true,
      });
      await bobInvitations.waitForInvitation(observableInvitation.get());
      await alice.destroy();
      // Bob admits Fred
      const fredInvitations = createInvitationTracker(fred);
      fred.spaces.join(observableInvitation.get());
      await waitForSpace(fred, space.key!, { ready: true });
      // Fred can also handle the invitation now.
      await fredInvitations.waitForInvitation(observableInvitation.get());
      // Charlie gets admitted using the same invitation after some time.
      await sleep(10);
      charlie.spaces.join(observableInvitation.get());
      await waitForSpace(charlie, space.key!, { ready: true });
    });
  });

  const createInvitationTracker = (peer: Client) => {
    let awaitedInvitationId: string | null = null;
    const onInvitationAppeared = new Trigger();
    const invitationIds = new Set();
    const invitationsEmpty = new Trigger();
    const invitationStream = peer.services.services.InvitationsService!.queryInvitations();
    afterTest(() => invitationStream.close());
    invitationStream.subscribe((msg) => {
      if (msg.type === QueryInvitationsResponse.Type.ACCEPTED) {
        return;
      }
      if (msg.action === QueryInvitationsResponse.Action.ADDED) {
        msg.invitations?.forEach((inv) => invitationIds.add(inv.invitationId));
        if (awaitedInvitationId != null && invitationIds.has(awaitedInvitationId)) {
          awaitedInvitationId = null;
          onInvitationAppeared.wake();
        }
      } else if (msg.action === QueryInvitationsResponse.Action.REMOVED) {
        msg.invitations?.forEach((inv) => invitationIds.delete(inv.invitationId));
        if (invitationIds.size > 0) {
          invitationsEmpty.wake();
        }
      }
    });
    return {
      get invitations() {
        return invitationIds;
      },
      waitEmpty: (): Promise<void> => {
        if (invitationIds.size === 0) {
          return Promise.resolve();
        }
        invitationsEmpty.reset();
        return invitationsEmpty.wait();
      },
      waitForInvitation: (invitation: Invitation) => {
        if (invitationIds.has(invitation.invitationId)) {
          return Promise.resolve();
        }
        awaitedInvitationId = invitation.invitationId;
        onInvitationAppeared.reset();
        return onInvitationAppeared.wait();
      },
    };
  };

  const createInitializedClients = (count: number): Promise<Client[]> => {
    const context = new Context();
    afterTest(() => context.dispose());
    return createInitializedClientsWithContext(context, count);
  };
});
