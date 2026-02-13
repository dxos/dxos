//
// Copyright 2021 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { performInvitation } from '@dxos/client-services/testing';
import { Context } from '@dxos/context';
import { TestSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { decodePublicKey } from '@dxos/protocols/buf';
import {
  type Invitation,
  Invitation_AuthMethod,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  type QueryInvitationsResponse as BufQueryInvitationsResponse,
  QueryInvitationsResponse_Action,
  QueryInvitationsResponse_Type,
} from '@dxos/protocols/buf/dxos/client/services_pb';

import { type Client } from '../client';
import { createInitializedClientsWithContext, testSpaceAutomerge, waitForSpace } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const [client1, client2] = await createInitializedClients(2);
    await Promise.all([client1, client2].map((c) => c.addTypes([TestSchema.Expando])));

    log('initialized');

    const space1 = await client1.spaces.create();
    log('spaces.create', { key: space1.key });
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1 as never, guest: client2.spaces as never }),
    );
    expect(guestInvitation?.spaceKey).to.deep.eq(space1.key);
    expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
    expect(hostInvitation?.state).to.eq(Invitation_State.SUCCESS);

    {
      const space = await waitForSpace(client2, decodePublicKey(guestInvitation!.spaceKey!), { ready: true });
      await testSpaceAutomerge(expect, space.db);
    }
  });

  describe('delegated', () => {
    test('single-use', async () => {
      const clients = await createInitializedClients(3);
      const [alice, bob, fred] = clients;

      // Alice invites Bob.
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space as never, guest: bob.spaces as never }));
      expect(hostInvitation?.state).to.eq(Invitation_State.SUCCESS);

      // Alice creates a delegated invitation.
      const bobInvitations = createInvitationTracker(bob);
      const observableInvitation = space.share({
        type: Invitation_Type.DELEGATED,
        authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
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
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space as never, guest: bob.spaces as never }));
      expect(hostInvitation?.state).to.eq(Invitation_State.SUCCESS);

      // Alice creates a delegated invitation.
      const bobInvitations = createInvitationTracker(bob);
      const observableInvitation = space.share({
        type: Invitation_Type.DELEGATED,
        authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
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
    onTestFinished(() => invitationStream.close());
    invitationStream.subscribe((msg: BufQueryInvitationsResponse) => {
      if (msg.type === QueryInvitationsResponse_Type.ACCEPTED) {
        return;
      }
      if (msg.action === QueryInvitationsResponse_Action.ADDED) {
        msg.invitations?.forEach((inv: Invitation) => invitationIds.add(inv.invitationId));
        if (awaitedInvitationId != null && invitationIds.has(awaitedInvitationId)) {
          awaitedInvitationId = null;
          onInvitationAppeared.wake();
        }
      } else if (msg.action === QueryInvitationsResponse_Action.REMOVED) {
        msg.invitations?.forEach((inv: Invitation) => invitationIds.delete(inv.invitationId));
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
    onTestFinished(async () => {
      await context.dispose();
    });
    return createInitializedClientsWithContext(context, count);
  };
});
