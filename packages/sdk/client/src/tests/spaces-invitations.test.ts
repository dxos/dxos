//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { sleep, Trigger } from '@dxos/async';
import { type CancellableInvitation } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { log } from '@dxos/log';
import { Invitation, QueryInvitationsResponse } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { Client } from '../client';
import { TestBuilder, testSpaceAutomerge, waitForSpace } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const [client1, client2] = await createInitializedClients(2);
    afterTest(() => destroyClients([client1, client2]));

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
      afterTest(() => destroyClients(clients));
      const [alice, bob, fred] = clients;

      // Alice invites Bob
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
      expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

      // Alice creates a delegated invitation
      const delegatedInvitationPosted = new Trigger();
      const delegatedInvitationDisposed = new Trigger();
      const invitationStream = bob.services.services.InvitationsService!.queryInvitations();
      afterTest(() => invitationStream.close());
      let observableInvitation: CancellableInvitation | null = null;
      invitationStream.subscribe((msg) => {
        const invitation = observableInvitation?.get();
        if (invitation == null) {
          return;
        }
        if (invitation.invitationId === msg.invitations?.[0]?.invitationId) {
          if (msg.action === QueryInvitationsResponse.Action.ADDED) {
            delegatedInvitationPosted.wake();
          } else if (msg.action === QueryInvitationsResponse.Action.REMOVED) {
            delegatedInvitationDisposed.wake();
          }
        }
      });
      observableInvitation = space.share({
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: false,
      });
      await delegatedInvitationPosted.wait();
      // Alice leaves
      await alice.destroy();
      // Bob admits Fred
      fred.spaces.join(observableInvitation.get());
      await waitForSpace(fred, space.key!, { ready: true });
      // Invitation gets disposed
      await delegatedInvitationDisposed.wait();
    });

    test('multi-use', async () => {
      const clients = await createInitializedClients(4);
      afterTest(() => destroyClients(clients));
      const [alice, bob, fred, charlie] = clients;

      // Alice invites Bob
      const space = await alice.spaces.create();
      const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
      expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

      // Alice creates a delegated invitation
      const delegatedInvitationPosted = new Trigger();
      const invitationStream = bob.services.services.InvitationsService!.queryInvitations();
      afterTest(() => invitationStream.close());
      let observableInvitation: CancellableInvitation | null = null;
      invitationStream.subscribe((msg) => {
        const invitation = observableInvitation?.get();
        if (invitation == null) {
          return;
        }
        if (invitation.invitationId === msg.invitations?.[0]?.invitationId) {
          delegatedInvitationPosted.wake();
        }
      });
      observableInvitation = space.share({
        type: Invitation.Type.DELEGATED,
        authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
        multiUse: true,
      });
      await delegatedInvitationPosted.wait();
      await alice.destroy();
      // Bob admits Fred
      fred.spaces.join(observableInvitation.get());
      await waitForSpace(fred, space.key!, { ready: true });
      // Charlie gets admitted using the same invitation after some time
      await sleep(10);
      charlie.spaces.join(observableInvitation.get());
      await waitForSpace(charlie, space.key!, { ready: true });
    });
  });
});

const createInitializedClients = (count: number): Promise<Client[]> => {
  const testBuilder = new TestBuilder();
  const clients = range(count).map(() => new Client({ services: testBuilder.createLocal() }));
  return Promise.all(
    clients.map(async (c, index) => {
      await c.initialize();
      await c.halo.createIdentity({ displayName: `Peer ${index}` });
      return c;
    }),
  );
};

const destroyClients = async (clients: Client[]): Promise<void> => {
  await Promise.all(clients.map((c) => c.destroy()));
};
