//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'earljs';

import { asyncTimeout, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, Messenger } from '@dxos/messaging';
import { afterTest, beforeEach, describe, test } from '@dxos/test';

import { TestWireProtocol } from '../testing/test-wire-protocol';
import { FullyConnectedTopology } from '../topology';
import { createWebRTCTransportFactory } from '../transport';
import { Swarm } from './swarm';

describe('Swarm', () => {
  const context = new MemorySignalManagerContext();
  let signalManager: MemorySignalManager;

  beforeEach(() => {
    signalManager = new MemorySignalManager(context);
    afterTest(() => signalManager.destroy());
  });

  const setupSwarm = ({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) => {
    const protocol = new TestWireProtocol(peerId);
    const swarm = new Swarm(
      topic,
      peerId,
      new FullyConnectedTopology(),
      protocol.factory,
      new Messenger({ signalManager }),
      createWebRTCTransportFactory(),
      undefined
    );

    afterTest(async () => {
      await swarm.destroy();
    });

    return { swarm, protocol };
  };

  test('connects two peers in a swarm', async () => {
    const topic = PublicKey.random();
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const { swarm: swarm1, protocol: protocol1 } = setupSwarm({ topic, peerId: peerId1 });

    const { swarm: swarm2, protocol: protocol2 } = setupSwarm({ topic, peerId: peerId2 });

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

    (await protocol1.waitForConnection(peerId2)).test();
  }).timeout(5_000);

  test('two peers try to originate connections to each other simultaneously', async () => {
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

  test('second peer discovered after delay', async () => {
    const topic = PublicKey.random();
    const peerId1 = PublicKey.random();
    const peerId2 = PublicKey.random();

    const { swarm: swarm1, protocol: protocol1 } = setupSwarm({ topic, peerId: peerId1 });

    const { swarm: swarm2, protocol: protocol2 } = setupSwarm({ topic, peerId: peerId2 });

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

    (await protocol1.waitForConnection(peerId2)).test();
  }).timeout(10_000);
});
