//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { log } from '@dxos/log';
import { Invitation, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { SpaceProxy } from '../echo/space-proxy';
import { syncItems, TestBuilder } from '../testing';

// TODO(burdon): Use as set-up for test suite.
// TODO(burdon): Timeouts and progress callback/events.

describe('Client services', () => {
  test('creates client with local host', async () => {
    const testBuilder = new TestBuilder();

    const servicesProvider = testBuilder.createLocal();
    await servicesProvider.open();
    afterTest(() => servicesProvider.close());

    const client = new Client({ services: servicesProvider });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('creates client with remote server', async () => {
    const testBuilder = new TestBuilder();

    const peer = testBuilder.createClientServicesHost();
    await peer.open();
    afterTest(() => peer.close());

    const [client, server] = testBuilder.createClientServer(peer);
    void server.open();
    afterTest(() => server.close());

    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('creates clients with multiple peers connected via memory transport', async () => {
    const testBuilder = new TestBuilder();

    {
      const peer1 = testBuilder.createClientServicesHost();
      await peer1.open();
      afterTest(() => peer1.close());

      {
        const [client1a, server1a] = testBuilder.createClientServer(peer1);
        void server1a.open();
        await client1a.initialize();
        afterTest(async () => {
          await client1a.destroy();
          await server1a.close();
        });
        expect(client1a.initialized).to.be.true;

        await client1a.halo.createIdentity();
      }
      {
        const [client1b, server1b] = testBuilder.createClientServer(peer1);
        void server1b.open();
        await client1b.initialize();
        afterTest(async () => {
          await client1b.destroy();
          await server1b.close();
        });
        expect(client1b.initialized).to.be.true;

        // TODO(burdon): Test profile is available.
      }
    }

    {
      const peer2 = testBuilder.createClientServicesHost();
      await peer2.open();
      afterTest(() => peer2.close());

      {
        const [client2a, server2a] = testBuilder.createClientServer(peer2);
        void server2a.open();
        await client2a.initialize();
        afterTest(async () => {
          await client2a.destroy();
          await server2a.close();
        });
        expect(client2a.initialized).to.be.true;

        await client2a.halo.createIdentity();
      }
    }
  });

  test('creates identity and invites peer', async () => {
    const testBuilder = new TestBuilder();

    const peer1 = testBuilder.createClientServicesHost();
    const peer2 = testBuilder.createClientServicesHost();

    await peer1.open();
    await peer2.open();

    const [client1, server1] = testBuilder.createClientServer(peer1);
    const [client2, server2] = testBuilder.createClientServer(peer2);

    // Don't wait (otherwise will block).
    {
      void server1.open();
      void server2.open();

      await client1.initialize();
      await client2.initialize();

      await client1.halo.createIdentity();
    }

    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({
        host: client1.halo,
        guest: client2.halo,
        options: { authMethod: Invitation.AuthMethod.SHARED_SECRET },
      }),
    );

    // Check same identity.
    expect(hostInvitation!.identityKey).not.to.exist;
    expect(guestInvitation?.identityKey).to.deep.eq(client1.halo.identity.get()!.identityKey);
    expect(guestInvitation?.identityKey).to.deep.eq(client2.halo.identity.get()!.identityKey);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
    expect(guestInvitation?.state).to.eq(Invitation.State.SUCCESS);

    // Check devices.
    // TODO(burdon): Incorrect number of devices.
    await waitForExpect(async () => {
      expect(client1.halo.devices.get()).to.have.lengthOf(2);
      expect(client2.halo.devices.get()).to.have.lengthOf(2);
    });
  });

  test('synchronizes data between two spaces after completing invitation', async () => {
    const testBuilder = new TestBuilder();

    const peer1 = testBuilder.createClientServicesHost();
    const peer2 = testBuilder.createClientServicesHost();

    await peer1.open();
    await peer2.open();

    const [client1, server1] = testBuilder.createClientServer(peer1);
    const [client2, server2] = testBuilder.createClientServer(peer2);

    // Don't wait (otherwise will block).
    {
      void server1.open();
      void server2.open();

      await client1.initialize();
      await client2.initialize();
      await client1.halo.createIdentity({ displayName: 'Peer 1' });
      await client2.halo.createIdentity({ displayName: 'Peer 2' });
    }
    log('initialized');

    afterTest(async () => {
      await client1.destroy();
      await server1.close();
      await peer1.close();
    });
    afterTest(async () => {
      await client2.destroy();
      await server2.close();
      await peer2.close();
    });

    const hostSpace = await client1.createSpace();
    log('createSpace', { key: hostSpace.key });
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({
        host: hostSpace as SpaceProxy,
        guest: client2,
        options: { authMethod: Invitation.AuthMethod.SHARED_SECRET },
      }),
    );

    expect(guestInvitation?.spaceKey).to.deep.eq(hostSpace.key);
    expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

    log('Invitation complete');

    // TODO(burdon): Space should now be available?
    const trigger = new Trigger<Space>();
    await waitForExpect(() => {
      const guestSpace = client2.getSpace(guestInvitation!.spaceKey!);
      assert(guestSpace);
      expect(guestSpace).to.exist;
      trigger.wake(guestSpace);
    });

    const guestSpace = await trigger.wait();

    for (const space of [hostSpace, guestSpace]) {
      await waitForExpect(() => {
        expect(space.members.get()).to.deep.equal([
          {
            identity: {
              identityKey: client1.halo.identity.get()!.identityKey,
              profile: {
                displayName: 'Peer 1',
              },
            },
            presence: SpaceMember.PresenceState.ONLINE,
          },
          {
            identity: {
              identityKey: client2.halo.identity.get()!.identityKey,
              profile: {
                displayName: 'Peer 2',
              },
            },
            presence: SpaceMember.PresenceState.ONLINE,
          },
        ]);
      }, 3_000);
    }

    await syncItems(hostSpace.internal.db, guestSpace.internal.db);
  });
});
