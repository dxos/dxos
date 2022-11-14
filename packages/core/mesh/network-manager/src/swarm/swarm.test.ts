//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { sleep, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, Messenger } from '@dxos/messaging';
import { afterTest } from '@dxos/testutils';

import { TestProtocolPlugin, testProtocolProvider } from '../testing';
import { FullyConnectedTopology } from '../topology';
import { createWebRTCTransportFactory, WebRTCTransport } from '../transport';
import { Swarm } from './swarm';

describe.only('Swarm', function () {
  const context = new MemorySignalManagerContext();
  let signalManager: MemorySignalManager;

  beforeEach(function () {
    signalManager = new MemorySignalManager(context);
    afterTest(() => signalManager.destroy());
  });

  const setupSwarm = ({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) => {
    const plugin = new TestProtocolPlugin(peerId.asBuffer());
    const swarm = new Swarm(
      topic,
      peerId,
      new FullyConnectedTopology(),
      testProtocolProvider(topic.asBuffer(), peerId, plugin),
      new Messenger({ signalManager }),
      createWebRTCTransportFactory(),
      undefined
    );

    afterTest(async () => {
      await swarm.destroy();
    });

    return { swarm, plugin };
  };

  it('connects two peers in a swarm', async function () {
    const topic = PublicKey.random();
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const data = 'Hello';

    const { swarm: swarm1, plugin: plugin1 } = setupSwarm({ topic, peerId: peerId1 });
    let receivedData: string;
    plugin1.on('receive', async (_, payload) => {
      receivedData = payload;
    });

    const { swarm: swarm2, plugin: plugin2 } = setupSwarm({ topic, peerId: peerId2 });
    plugin2.on('connect', async () => {
      await plugin2.send(peerId1.asBuffer(), data);
    });

    expect(swarm1.connections.length).toEqual(0);
    expect(swarm2.connections.length).toEqual(0);

    const promise = Promise.all([
      asyncTimeout(swarm1.connected.waitForCount(1), 3000, new Error('Swarm1 connect timeout.')),
      asyncTimeout(swarm2.connected.waitForCount(1), 3000, new Error('Swarm2 connect timeout.'))
    ]);

    // Behavior of the Signal Server.
    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId1.asUint8Array(),
        since: new Date()
      }
    });

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });

    log('Candidates changed');
    await promise;
    log('Swarms connected');

    await waitForExpect(() => {
      expect(receivedData).toEqual(data);
    });
  }).timeout(5_000);

  it('two peers try to originate connections to each other simultaneously', async function () {
    const topic = PublicKey.random();
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const { swarm: swarm1 } = setupSwarm({ topic, peerId: peerId1 });
    const { swarm: swarm2 } = setupSwarm({ topic, peerId: peerId2 });

    expect(swarm1.connections.length).toEqual(0);
    expect(swarm2.connections.length).toEqual(0);

    const connectPromises = Promise.all([swarm1.connected.waitForCount(1), swarm2.connected.waitForCount(1)]);

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });

    swarm2.onSwarmEvent({
      peerAvailable: {
        peer: peerId1.asUint8Array(),
        since: new Date()
      }
    });

    await connectPromises;
  }).timeout(5_000);

  it('second peer discovered after delay', async function () {
    const topic = PublicKey.random();
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();
    const data = 'Hello';

    const { swarm: swarm1, plugin: plugin1 } = setupSwarm({ topic, peerId: peerId1 });
    let receivedData: string;
    plugin1.on('receive', async (_, payload) => {
      receivedData = payload;
    });

    const { swarm: swarm2, plugin: plugin2 } = setupSwarm({ topic, peerId: peerId2 });
    plugin2.on('connect', async () => {
      await plugin2.send(peerId1.asBuffer(), data);
    });

    expect(swarm1.connections.length).toEqual(0);
    expect(swarm2.connections.length).toEqual(0);

    const connectPromises = Promise.all([swarm1.connected.waitForCount(1), swarm2.connected.waitForCount(1)]);

    swarm1.onSwarmEvent({
      peerAvailable: {
        peer: peerId2.asUint8Array(),
        since: new Date()
      }
    });
    await sleep(15);
    swarm2.onSwarmEvent({
      peerAvailable: {
        peer: peerId1.asUint8Array(),
        since: new Date()
      }
    });

    await connectPromises;

    await waitForExpect(() => {
      expect(receivedData).toEqual(data);
    });
  }).timeout(10_000);
});
