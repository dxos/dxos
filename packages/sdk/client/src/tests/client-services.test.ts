//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { Device, DeviceKind, Invitation, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { syncItemsAutomerge, TestBuilder } from '../testing';

// TODO(burdon): Use as set-up for test suite.
// TODO(burdon): Timeouts and progress callback/events.

describe('Client services', () => {
  test('creates client with local host', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    const servicesProvider = testBuilder.createLocalClientServices();
    await servicesProvider.open();
    afterTest(() => servicesProvider.close());

    const client = new Client({ services: servicesProvider });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('creates client with remote server', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    const peer = testBuilder.createClientServicesHost();
    await peer.open(new Context());
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
    testBuilder.level = createTestLevel();
    afterTest(() => testBuilder.destroy());

    {
      const peer1 = testBuilder.createClientServicesHost();
      await peer1.open(new Context());
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
      await peer2.open(new Context());
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
    afterTest(() => testBuilder.destroy());

    const peer1 = testBuilder.createClientServicesHost({
      devicePresenceAnnounceInterval: 1_000,
      devicePresenceOfflineTimeout: 2_000,
    });
    const peer2 = testBuilder.createClientServicesHost({
      devicePresenceAnnounceInterval: 1_000,
      devicePresenceOfflineTimeout: 2_000,
    });

    await peer1.open(new Context());
    await peer2.open(new Context());

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

    await waitForExpect(async () => {
      expect(client1.halo.devices.get().find((device) => device?.kind === DeviceKind.TRUSTED)?.presence).to.eq(
        Device.PresenceState.ONLINE,
      );
      expect(client2.halo.devices.get().find((device) => device?.kind === DeviceKind.TRUSTED)?.presence).to.eq(
        Device.PresenceState.ONLINE,
      );
    });

    // Ensure peer2 shows up as offline to peer1.
    await client2.destroy();
    await server2.close();
    await peer2.close();

    await waitForExpect(async () => {
      expect(client1.halo.devices.get().find((device) => device?.kind === DeviceKind.TRUSTED)?.presence).to.eq(
        Device.PresenceState.OFFLINE,
      );
    });
  });

  test('synchronizes data between two spaces after completing invitation', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    const peer1 = testBuilder.createClientServicesHost();
    const peer2 = testBuilder.createClientServicesHost();

    await peer1.open(new Context());
    await peer2.open(new Context());

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

    const hostSpace = await client1.spaces.create();
    log('spaces.create', { key: hostSpace.key });

    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({
        host: hostSpace,
        guest: client2.spaces,
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
      const guestSpace = client2.spaces.get(guestInvitation!.spaceKey!);
      invariant(guestSpace);
      expect(guestSpace).to.exist;
      trigger.wake(guestSpace);
    });

    const guestSpace = await trigger.wait();

    for (const space of [hostSpace, guestSpace]) {
      await waitForExpect(() => {
        const members = space.members.get();
        expect(members).to.have.length(2);
        members.sort((m1, m2) => (m1.identity.identityKey.equals(client1.halo.identity.get()!.identityKey) ? -1 : 1));
        expect(members[0]).to.deep.include({
          identity: {
            identityKey: client1.halo.identity.get()!.identityKey,
            profile: {
              displayName: 'Peer 1',
            },
          },
          presence: SpaceMember.PresenceState.ONLINE,
        });
        expect(members[1]).to.deep.include({
          identity: {
            identityKey: client2.halo.identity.get()!.identityKey,
            profile: {
              displayName: 'Peer 2',
            },
          },
          presence: SpaceMember.PresenceState.ONLINE,
        });
      }, 20_000);
    }

    await syncItemsAutomerge(hostSpace.db, guestSpace.db);
  }).timeout(20_000);
});
