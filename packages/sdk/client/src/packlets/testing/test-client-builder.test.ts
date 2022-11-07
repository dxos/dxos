//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';

import { ClientServicesProxy } from '@dxos/client-services';
import { createLinkedPorts } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { Client, fromIFrame } from '../client';
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

    const [proxyPort, hostPort] = createLinkedPorts();
    const server = peer.createPeer(hostPort);
    void server.open();
    afterTest(() => server.close());

    const client = new Client({ services: new ClientServicesProxy(proxyPort) });
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

    // TODO(burdon): Test party invitations.
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
