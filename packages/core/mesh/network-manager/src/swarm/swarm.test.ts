//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, Messenger, type SignalManager } from '@dxos/messaging';
import { afterTest, describe, test } from '@dxos/test';
import { ComplexSet } from '@dxos/util';

import { ConnectionState } from './connection';
import { ConnectionLimiter } from './connection-limiter';
import { Swarm } from './swarm';
import { TestWireProtocol } from '../testing/test-wire-protocol';
import { FullyConnectedTopology } from '../topology';
import { createLibDataChannelTransportFactory, createSimplePeerTransportFactory } from '../transport';

type TestPeer = {
  swarm: Swarm;
  peerId: PublicKey;
  protocol: TestWireProtocol;
  topic: PublicKey;
  signalManager: SignalManager;
};

describe('Swarm', () => {
  const context = new MemorySignalManagerContext();

  const setupSwarm = async ({
    topic = PublicKey.random(),
    peerId = PublicKey.random(),
    connectionLimiter = new ConnectionLimiter(),
    signalManager = new MemorySignalManager(context),
    initiationDelay = 100,
  }: {
    topic?: PublicKey;
    peerId?: PublicKey;
    connectionLimiter?: ConnectionLimiter;
    signalManager?: SignalManager;
    initiationDelay?: number;
  }): Promise<TestPeer> => {
    const protocol = new TestWireProtocol(peerId);
    const swarm = new Swarm(
      topic,
      peerId,
      new FullyConnectedTopology(),
      protocol.factory,
      new Messenger({ signalManager }),
      // TODO(nf): configure better
      process.env.MOCHA_ENV === 'nodejs' ? createLibDataChannelTransportFactory() : createSimplePeerTransportFactory(),
      undefined,
      connectionLimiter,
      initiationDelay,
    );

    afterTest(async () => {
      await swarm.destroy();
      await signalManager.close();
    });

    await swarm.open();

    return { swarm, protocol, topic, peerId, signalManager };
  };

  test('connects two peers in a swarm', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    await connectSwarms(peer1, peer2);
  }).timeout(5_000);

  test('two peers try to originate connections to each other simultaneously', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    await connectSwarms(peer1, peer2);
  }).timeout(5_000);

  test('with simultaneous connections one of the peers drops initiated connection', async () => {
    const topic = PublicKey.random();

    const peerId1 = PublicKey.fromHex('39ba0e42');
    const peerId2 = PublicKey.fromHex('7d2bc6ab');

    const peer1 = await setupSwarm({ peerId: peerId1, topic, initiationDelay: 0 });
    const peer2 = await setupSwarm({ peerId: peerId2, topic, initiationDelay: 0 });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    const connectionDisplaced = peer2.swarm._peers.get(peerId1)?.connectionDisplaced.waitForCount(1);

    await connectSwarms(peer1, peer2);
    await asyncTimeout(connectionDisplaced!, 1000);
  }).timeout(5_000);

  test('second peer discovered after delay', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    await connectSwarms(peer1, peer2, () => sleep(15));
  }).timeout(10_000);

  test('connection limiter', async () => {
    // remotePeer1 <--> peer (connectionLimiter: max = 1) <--> remotePeer2

    const peerId = PublicKey.fromHex('7701dc2d');
    const remotePeerId1 = PublicKey.fromHex('7d2bc6aa');
    const remotePeerId2 = PublicKey.fromHex('39ba0e41');

    const topic = PublicKey.random();
    const connectionLimiter = new ConnectionLimiter({ maxConcurrentInitConnections: 1 });

    const signalManager = new MemorySignalManager(context);
    const sendOriginal = signalManager.sendMessage.bind(signalManager);
    const messages = new ComplexSet<{ author: PublicKey; recipient: PublicKey }>(
      ({ author, recipient }) => author.toHex() + recipient.toHex(),
    );
    signalManager.sendMessage = async (message) => {
      messages.add({ author: message.author, recipient: message.recipient });
      return sendOriginal(message);
    };
    // Stop signaling to stop connection in initiation state.
    signalManager.freeze();

    const peer = await setupSwarm({
      topic,
      peerId,
      connectionLimiter,
      signalManager,
    });
    const remotePeer1 = await setupSwarm({ peerId: remotePeerId1, topic });
    const remotePeer2 = await setupSwarm({ peerId: remotePeerId2, topic });

    let connected1: Promise<void>;
    {
      // Connection limiter allow only one connection to be started.
      const connectionInit = peer.swarm.connectionAdded.waitForCount(1);
      connected1 = connectSwarms(peer, remotePeer1);
      await asyncTimeout(connectionInit, 1000);
    }

    let connected2: Promise<void>;
    {
      // Connection limiter should prevent second connection from being started (only created).
      const connectionInit = peer.swarm.connectionAdded.waitForCount(1);
      connected2 = connectSwarms(peer, remotePeer2);
      await asyncTimeout(connectionInit, 1000);
    }

    {
      // Peer sent messages only to first remote peer.
      expect(messages.has({ author: peer.peerId, recipient: remotePeer1.peerId })).to.equal(true);
      expect(messages.has({ author: peer.peerId, recipient: remotePeer2.peerId })).to.equal(false);
    }

    signalManager.unfreeze();

    await Promise.all([connected1, connected2]);
  });
});

const connectSwarms = async (peer1: TestPeer, peer2: TestPeer, delay = async () => {}) => {
  const connect1 = peer1.swarm.connected.waitForCount(1);
  const connect2 = peer2.swarm.connected.waitForCount(1);

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

  if (
    !(
      peer1.swarm.connections.find((connection) => connection.remoteId.equals(peer2.peerId))?.state ===
      ConnectionState.CONNECTED
    )
  ) {
    await asyncTimeout(connect1, 3000);
  }
  if (
    !(
      peer2.swarm.connections.find((connection) => connection.remoteId.equals(peer1.peerId))?.state ===
      ConnectionState.CONNECTED
    )
  ) {
    await asyncTimeout(connect2, 3000);
  }

  await peer1.protocol.testConnection(peer2.peerId, 'test message 1');
  await peer2.protocol.testConnection(peer1.peerId, 'test message 2');
};
