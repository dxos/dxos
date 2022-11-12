//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import { afterTest } from '@dxos/testutils';

import { NetworkManager } from './network-manager';
import { createPeer, TestBuilder, TestProtocolPlugin, testProtocolProvider } from './testing';
import { FullyConnectedTopology } from './topology';
import { TransportFactory } from './transport';

export const sharedTests = ({
  inMemory,
  signalUrl,
  getTransportFactory
}: {
  inMemory: boolean;
  signalUrl?: string;
  getTransportFactory: () => Promise<TransportFactory>;
}) => {
  it('two peers connect to each other', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const { plugin: plugin1 } = await createPeer({
      topic,
      peerId: peer1Id,
      signalHosts: !inMemory ? [signalUrl!] : undefined,
      transportFactory: await getTransportFactory()
    });
    const { plugin: plugin2 } = await createPeer({
      topic,
      peerId: peer2Id,
      signalHosts: !inMemory ? [signalUrl!] : undefined,
      transportFactory: await getTransportFactory()
    });

    const received: any[] = [];
    const mockReceive = (p: Protocol, s: string) => {
      received.push(p, s);
      return undefined;
    };

    plugin1.on('receive', mockReceive);
    plugin2.on('connect', async () => {
      await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
    });

    await waitForExpect(() => {
      expect(received.length).toBe(2);
      expect(received[0]).toBeInstanceOf(Protocol);
      expect(received[1]).toBe('{"message": "Hello"}');
    });
  })
    .timeout(10_000)
    .retries(10);

  it('join and leave swarm', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const { networkManager: networkManager1, plugin: plugin1 } = await createPeer({
      topic,
      peerId: peer1Id,
      signalHosts: !inMemory ? [signalUrl!] : undefined,
      transportFactory: await getTransportFactory()
    });
    const { networkManager: networkManager2, plugin: plugin2 } = await createPeer({
      topic,
      peerId: peer2Id,
      signalHosts: !inMemory ? [signalUrl!] : undefined,
      transportFactory: await getTransportFactory()
    });

    await Promise.all([Event.wrap(plugin1, 'connect').waitForCount(1), Event.wrap(plugin2, 'connect').waitForCount(1)]);
    log('Connected');

    const promise1 = Event.wrap(plugin1, 'disconnect').waitForCount(1);
    const promise2 = Event.wrap(plugin2, 'disconnect').waitForCount(1);

    await networkManager1.closeSwarmConnection(topic);

    await promise1;
    log('Peer1 disconnected');

    await promise2;
    log('Peer2 disconnected');

    await networkManager1.destroy();
    log('Peer1 destroyed');
    await networkManager2.destroy();
    log('Peer2 destroyed');
  })
    .timeout(10_000)
    .retries(10);

  it('join and leave swarm and reconnect', async () => {
    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const { networkManager: networkManager1, plugin: plugin1 } = await createPeer({
      topic,
      peerId: peer1Id,
      signalHosts: !inMemory ? [signalUrl!] : undefined,
      transportFactory: await getTransportFactory()
    });
    const { networkManager: networkManager2, plugin: plugin2 } = await createPeer({
      topic,
      peerId: peer2Id,
      signalHosts: !inMemory ? [signalUrl!] : undefined,
      transportFactory: await getTransportFactory()
    });

    // prettier-ignore
    await Promise.all([
      Event.wrap(plugin1, 'connect').waitForCount(1),
      Event.wrap(plugin2, 'connect').waitForCount(1)
    ]);
    log('Connected');

    const disconnectPromises = Promise.all([
      Event.wrap(plugin1, 'disconnect').waitForCount(1),
      Event.wrap(plugin2, 'disconnect').waitForCount(1)
    ]);

    const connectPromises = Promise.all([
      Event.wrap(plugin1, 'connect').waitForCount(1),
      Event.wrap(plugin2, 'connect').waitForCount(1)
    ]);

    log('Disconnecting peer2');
    await networkManager2.closeSwarmConnection(topic);

    log('Reconnecting peer2');
    const newPeer2Id = PublicKey.random();
    await networkManager2.openSwarmConnection({
      topic,
      peerId: newPeer2Id,
      protocol: testProtocolProvider(topic.asBuffer(), peer2Id, plugin2),
      topology: new FullyConnectedTopology()
    });

    await disconnectPromises;
    await connectPromises;

    await networkManager1.destroy();
    log('Peer1 destroyed');
    await networkManager2.destroy();
    log('Peer2 destroyed');
  })
    .timeout(10_000)
    .retries(10);

  // TODO(burdon): Fails.
  it.skip('join two swarms', async () => {
    const testBuilder = new TestBuilder({ signalUrl: !inMemory ? signalUrl : undefined });

    const peerId = PublicKey.random();
    const plugin1 = new TestProtocolPlugin(peerId.asBuffer());
    const plugin2 = new TestProtocolPlugin(peerId.asBuffer());

    const networkManager = new NetworkManager({
      signalManager: testBuilder.createSignalManager(),
      transportFactory: await getTransportFactory()
    });
    afterTest(() => networkManager.destroy());

    // Joining first swarm.
    {
      const topic = PublicKey.random();
      await networkManager.openSwarmConnection({
        topic,
        peerId,
        protocol: testProtocolProvider(topic.asBuffer(), peerId, plugin1),
        topology: new FullyConnectedTopology()
      });

      // Creating and joining second peer.
      await createPeer({
        topic,
        peerId: PublicKey.random(),
        signalHosts: !inMemory ? [signalUrl!] : undefined,
        transportFactory: await getTransportFactory()
      });
    }

    // Joining second swarm with same peerId.
    {
      const topic = PublicKey.random();
      await networkManager.openSwarmConnection({
        topic,
        peerId,
        protocol: testProtocolProvider(topic.asBuffer(), peerId, plugin2),
        topology: new FullyConnectedTopology()
      });

      // Creating and joining second peer.
      await createPeer({
        topic,
        peerId: PublicKey.random(),
        signalHosts: !inMemory ? [signalUrl!] : undefined,
        transportFactory: await getTransportFactory()
      });
    }

    // prettier-ignore
    await Promise.all([
      Event.wrap(plugin1, 'connect').waitForCount(1),
      Event.wrap(plugin2, 'connect').waitForCount(1)
    ]);
  });

  it('two swarms at the same time', async () => {
    const topicA = PublicKey.random();
    const topicB = PublicKey.random();
    const peerA1Id = PublicKey.random();
    const peerA2Id = PublicKey.random();
    const peerB1Id = PublicKey.random();
    const peerB2Id = PublicKey.random();

    const { plugin: pluginA1 } = await createPeer({
      topic: topicA,
      peerId: peerA1Id,
      transportFactory: await getTransportFactory()
    });
    const { plugin: pluginA2 } = await createPeer({
      topic: topicA,
      peerId: peerA2Id,
      transportFactory: await getTransportFactory()
    });
    const { plugin: pluginB1 } = await createPeer({
      topic: topicB,
      peerId: peerB1Id,
      transportFactory: await getTransportFactory()
    });
    const { plugin: pluginB2 } = await createPeer({
      topic: topicB,
      peerId: peerB2Id,
      transportFactory: await getTransportFactory()
    });

    const receivedA: any[] = [];
    const mockReceiveA = (p: Protocol, s: string) => {
      receivedA.push(p, s);
      return undefined;
    };
    pluginA1.on('receive', mockReceiveA);

    const receivedB: any[] = [];
    const mockReceiveB = (p: Protocol, s: string) => {
      receivedB.push(p, s);
      return undefined;
    };
    pluginB1.on('receive', mockReceiveB);

    pluginA2.on('connect', async () => {
      await pluginA2.send(peerA1Id.asBuffer(), 'Test A');
    });
    pluginB2.on('connect', async () => {
      await pluginB2.send(peerB1Id.asBuffer(), 'Test B');
    });

    await waitForExpect(() => {
      expect(receivedA.length).toBe(2);
      expect(receivedA[0]).toBeInstanceOf(Protocol);
      expect(receivedA[1]).toBe('Test A');
      expect(receivedB.length).toBe(2);
      expect(receivedB[0]).toBeInstanceOf(Protocol);
      expect(receivedB[1]).toBe('Test B');
    });
  });
};
