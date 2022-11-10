//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { Client, fromIFrame } from '../client';
import { Party } from '../proxies';
import { TestClientBuilder } from './test-client-builder';

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

    const party1 = await client1.echo.createParty();
    const observable1 = await party1.createInvitation();
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

    // TODO(burdon): Party should now be available?
    const trigger = new Trigger<Party>();
    await waitForExpect(() => {
      const party2 = client2.echo.getParty(invitation2.spaceKey!);
      assert(party2);
      expect(party2).to.exist;
      trigger.wake(party2);
    });

    const party2 = await trigger.wait();

    // TODO(burdon): Factor out synchronization test.
    // TODO(burdon): Reconcile with `@dxos/client-services` `syncItems` (reconcile PartyProxy, Space).
    {
      const item1 = await party1.database.createItem({ type: 'type-1' });
      const item2 = await party2.database.waitForItem({ type: 'type-1' });
      expect(item1.id).to.eq(item2.id);
    }

    {
      const item1 = await party2.database.createItem({ type: 'type-2' });
      const item2 = await party1.database.waitForItem({ type: 'type-2' });
      expect(item1.id).to.eq(item2.id);
    }
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
