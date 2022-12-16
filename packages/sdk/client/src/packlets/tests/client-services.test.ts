//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { ISpace } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { SpaceMember } from '@dxos/protocols/proto/dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { Space } from '../proxies';
import { TestBuilder } from '../testing';

// TODO(wittjosiah): Copied from @dxos/client-services. Factor out.
const syncItems = async (space1: ISpace, space2: ISpace) => {
  {
    // Check item replicated from 1 => 2.
    const item1 = await space1.database!.createItem({ type: 'type-1' });
    const item2 = await space2.database!.waitForItem({ type: 'type-1' });
    expect(item1.id).to.eq(item2.id);
  }

  {
    // Check item replicated from 2 => 1.
    const item1 = await space2.database!.createItem({ type: 'type-2' });
    const item2 = await space1.database!.waitForItem({ type: 'type-2' });
    expect(item1.id).to.eq(item2.id);
  }
};

// TODO(burdon): Use as set-up for test suite.
// TODO(burdon): Timeouts and progress callback/events.

describe('Client services', () => {
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
        afterTest(() => Promise.all([client1a.destroy(), server1a.close()]));
        expect(client1a.initialized).to.be.true;

        await client1a.halo.createProfile();
      }
      {
        const [client1b, server1b] = testBuilder.createClientServer(peer1);
        void server1b.open();
        await client1b.initialize();
        afterTest(() => Promise.all([client1b.destroy(), server1b.close()]));
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
        afterTest(() => Promise.all([client2a.destroy(), server2a.close()]));
        expect(client2a.initialized).to.be.true;

        await client2a.halo.createProfile();
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

      await client1.halo.createProfile();
    }

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authenticationCode = new Trigger<string>();

    {
      const observable1 = client1.halo.createInvitation();
      observable1.subscribe({
        onConnecting: (invitation) => {
          const observable2 = client2.halo.acceptInvitation(invitation);
          observable2.subscribe({
            onAuthenticating: async () => {
              await observable2.authenticate(await authenticationCode.wait());
            },
            onSuccess: (invitation: Invitation) => {
              // TODO(burdon): No device.
              // expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);
              success2.wake(invitation);
            },
            onError: (err: Error) => raise(new Error(err.message))
          });
        },
        onConnected: (invitation: Invitation) => {
          assert(invitation.authenticationCode);
          authenticationCode.wake(invitation.authenticationCode);
        },
        onSuccess: (invitation: Invitation) => {
          success1.wake(invitation);
        },
        onCancelled: () => raise(new Error()),
        onTimeout: (err: Error) => raise(new Error(err.message)),
        onError: (err: Error) => raise(new Error(err.message))
      });
    }

    // Check same identity.
    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.identityKey).not.to.exist;
    expect(invitation2.identityKey).to.deep.eq(client1.halo.profile!.identityKey);
    expect(invitation2.identityKey).to.deep.eq(client2.halo.profile!.identityKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);
    expect(invitation2.state).to.eq(Invitation.State.SUCCESS);

    // Check devices.
    // TODO(burdon): Incorrect number of devices.
    await waitForExpect(async () => {
      expect((await client1.halo.queryDevices()).length).to.eq(2);
      expect((await client2.halo.queryDevices()).length).to.eq(2);
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
      await client1.halo.createProfile({ displayName: 'Peer 1' });
      await client2.halo.createProfile({ displayName: 'Peer 2' });
    }
    log('initialized');

    afterTest(() => Promise.all([client1.destroy(), server1.close(), peer1.close()]));
    afterTest(() => Promise.all([client2.destroy(), server2.close(), peer2.close()]));

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const space1 = await client1.echo.createSpace();
    log('createSpace', { key: space1.key });
    const observable1 = space1.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });

    observable1.subscribe({
      onConnecting: (invitation) => {
        const observable2 = client2.echo.acceptInvitation(invitation);
        observable2.subscribe({
          onSuccess: (invitation: Invitation) => {
            success2.wake(invitation);
          },
          onError: (err: Error) => raise(err)
        });
      },
      onSuccess: (invitation) => {
        log('onSuccess');
        success1.wake(invitation);
      },
      onError: (err) => raise(err)
    });

    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.spaceKey).to.deep.eq(invitation2.spaceKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);

    log('Invitation complete');

    // TODO(burdon): Space should now be available?
    const trigger = new Trigger<Space>();
    await waitForExpect(() => {
      const space2 = client2.echo.getSpace(invitation2.spaceKey!);
      assert(space2);
      expect(space2).to.exist;
      trigger.wake(space2);
    });

    const space2 = await trigger.wait();

    for (const space of [space1, space2]) {
      await space.queryMembers().waitFor((members) => members.length === 2);
      await waitForExpect(() => {
        expect(space.queryMembers().value).to.deep.equal([
          {
            identityKey: client1.halo.profile!.identityKey,
            profile: {
              identityKey: client1.halo.profile!.identityKey,
              displayName: 'Peer 1'
            },
            presenceState: SpaceMember.PresenceState.ONLINE
          },
          {
            identityKey: client2.halo.profile!.identityKey,
            profile: {
              identityKey: client2.halo.profile!.identityKey,
              displayName: 'Peer 2'
            },
            presenceState: SpaceMember.PresenceState.ONLINE
          }
        ]);
      }, 3_000);
    }

    await syncItems(space1, space2);
  });
});
