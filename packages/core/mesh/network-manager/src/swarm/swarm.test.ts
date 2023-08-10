//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'earljs';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, Messenger, SignalManager } from '@dxos/messaging';
import { afterTest, beforeEach, describe, test } from '@dxos/test';

import { TestWireProtocol } from '../testing/test-wire-protocol';
import { FullyConnectedTopology } from '../topology';
import { createWebRTCTransportFactory } from '../transport';
import { ConnectionLimiter } from './connection-limiter';
import { Swarm } from './swarm';

type TestPeer = {
  swarm: Swarm;
  peerId: PublicKey;
  protocol: TestWireProtocol;
  topic: PublicKey;
};

describe('Swarm', () => {
  const context = new MemorySignalManagerContext();
  let signal: MemorySignalManager;

  beforeEach(() => {
    signal = new MemorySignalManager(context);
    afterTest(() => signal.close());
  });

  const setupSwarm = async ({
    topic = PublicKey.random(),
    peerId = PublicKey.random(),
    connectionLimiter = new ConnectionLimiter(),
    signalManager = signal,
  }: {
    topic?: PublicKey;
    peerId?: PublicKey;
    connectionLimiter?: ConnectionLimiter;
    signalManager?: SignalManager;
  }): Promise<TestPeer> => {
    const protocol = new TestWireProtocol(peerId);
    const swarm = new Swarm(
      topic,
      peerId,
      new FullyConnectedTopology(),
      protocol.factory,
      new Messenger({ signalManager }),
      createWebRTCTransportFactory(),
      undefined,
      connectionLimiter,
    );

    afterTest(async () => {
      await swarm.destroy();
    });

    await swarm.open();

    return { swarm, protocol, topic, peerId };
  };

  test('connects two peers in a swarm', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });

    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).toEqual(0);
    expect(peer2.swarm.connections.length).toEqual(0);

    await connectSwarms(peer1, peer2);
  }).timeout(5_000);

  test('two peers try to originate connections to each other simultaneously', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).toEqual(0);
    expect(peer2.swarm.connections.length).toEqual(0);

    await connectSwarms(peer1, peer2);
  }).timeout(5_000);

  test('second peer discovered after delay', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).toEqual(0);
    expect(peer2.swarm.connections.length).toEqual(0);

    expect(peer1.swarm.connections.length).toEqual(0);
    expect(peer2.swarm.connections.length).toEqual(0);

    await connectSwarms(peer1, peer2, () => sleep(15));
  }).timeout(10_000);
});

const connectSwarms = async (peer1: TestPeer, peer2: TestPeer, delay = async () => {}) => {
  const connectPromises = Promise.all([peer1.swarm.connected.waitForCount(1), peer2.swarm.connected.waitForCount(1)]);

  peer1.swarm.onSwarmEvent({
    peerAvailable: {
      peer: peer2.peerId.asUint8Array(),
      since: new Date(),
    },
  });

  await delay();

  peer2.swarm.onSwarmEvent({
    peerAvailable: {
      peer: peer1.peerId.asUint8Array(),
      since: new Date(),
    },
  });

  await connectPromises;

  await peer1.protocol.testConnection(peer2.peerId);
  await peer2.protocol.testConnection(peer1.peerId);
};
