//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { ISpace } from '@dxos/echo-db';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { Client, fromIFrame } from '../client';
import { Space } from '../proxies';
import { TestClientBuilder } from './test-client-builder';

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

describe('Client services', function () {
  it('creates client with embedded services', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  it('creates client with remote server', async function () {
    const testBuilder = new TestClientBuilder();

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

  it('creates clients with multiple peers connected via memory transport', async function () {
    const testBuilder = new TestClientBuilder();

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

  it('creates identity and invites peer', async function () {
    const testBuilder = new TestClientBuilder();

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
      const observable1 = await client1.halo.createInvitation();
      observable1.subscribe({
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

      const observable2 = await client2.halo.acceptInvitation(observable1.invitation!);
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

  it('synchronizes data between two spaces after competing invitation', async function () {
    const testBuilder = new TestClientBuilder();

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
      await client2.halo.createProfile();
    }

    afterTest(() => Promise.all([client1.destroy(), server1.close(), peer1.close()]));
    afterTest(() => Promise.all([client2.destroy(), server2.close(), peer2.close()]));

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const space1 = await client1.echo.createSpace();
    const observable1 = await space1.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    const observable2 = await client2.echo.acceptInvitation(observable1.invitation!);

    observable1.subscribe({
      onSuccess: (invitation) => {
        success1.wake(invitation);
      },
      onError: (err) => raise(err)
    });

    observable2.subscribe({
      onSuccess: (invitation: Invitation) => {
        success2.wake(invitation);
      },
      onError: (err: Error) => raise(err)
    });

    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.spaceKey).to.deep.eq(invitation2.spaceKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);

    // TODO(burdon): Space should now be available?
    const trigger = new Trigger<Space>();
    await waitForExpect(() => {
      const space2 = client2.echo.getSpace(invitation2.spaceKey!);
      assert(space2);
      expect(space2).to.exist;
      trigger.wake(space2);
    });

    const space2 = await trigger.wait();

    await syncItems(space1, space2);
  });

  // TODO(burdon): Browser-only.
  it.skip('creates client with remote iframe', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({
      services: fromIFrame(testBuilder.config)
    });

    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });
});
