//
// Copyright 2020 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  Messenger,
  type PeerInfo,
  type SignalManager,
} from '@dxos/messaging';
import { ComplexSet } from '@dxos/util';

import { TestWireProtocol } from '../testing/test-wire-protocol';
import { FullyConnectedTopology } from '../topology';
import { createRtcTransportFactory } from '../transport';

import { ConnectionState } from './connection';
import { ConnectionLimiter } from './connection-limiter';
import { Swarm } from './swarm';

type TestPeer = {
  swarm: Swarm;
  peer: PeerInfo;
  protocol: TestWireProtocol;
  topic: PublicKey;
  signalManager: SignalManager;
};

// Segfault in node-datachannel.
describe.skip('Swarm', () => {
  const context = new MemorySignalManagerContext();

  const setupSwarm = async ({
    topic = PublicKey.random(),
    peer = { peerKey: PublicKey.random().toHex() },
    connectionLimiter = new ConnectionLimiter(),
    signalManager = new MemorySignalManager(context),
    initiationDelay = 100,
  }: {
    topic?: PublicKey;
    peer?: PeerInfo;
    connectionLimiter?: ConnectionLimiter;
    signalManager?: SignalManager;
    initiationDelay?: number;
  }): Promise<TestPeer> => {
    const protocol = new TestWireProtocol();
    const swarm = new Swarm(
      topic,
      peer,
      new FullyConnectedTopology(),
      protocol.factory,
      new Messenger({ signalManager }),
      createRtcTransportFactory(),
      undefined,
      connectionLimiter,
      initiationDelay,
    );

    onTestFinished(async () => {
      await swarm.destroy();
      await signalManager.close();
    });

    await swarm.open();

    return { swarm, protocol, topic, peer, signalManager };
  };

  test('connects two peers in a swarm', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    await connectSwarms(peer1, peer2);
  });

  test('two peers try to originate connections to each other simultaneously', async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    await connectSwarms(peer1, peer2);
  });

  test('with simultaneous connections one of the peers drops initiated connection', async () => {
    const topic = PublicKey.random();

    const peerInfo1 = { peerKey: '39ba0e42' };
    const peerInfo2 = { peerKey: '7d2bc6ab' };

    const peer1 = await setupSwarm({ peer: peerInfo1, topic, initiationDelay: 0 });
    const peer2 = await setupSwarm({ peer: peerInfo2, topic, initiationDelay: 0 });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    const connectionDisplaced = peer2.swarm._peers.get(peerInfo1)?.connectionDisplaced.waitForCount(1);

    await connectSwarms(peer1, peer2);
    await asyncTimeout(connectionDisplaced!, 1000);
  });

  test('second peer discovered after delay', { timeout: 10_000 }, async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    expect(peer1.swarm.connections.length).to.equal(0);
    expect(peer2.swarm.connections.length).to.equal(0);

    await connectSwarms(peer1, peer2, () => sleep(15));
  });

  test('reconnect', { timeout: 10_000 }, async () => {
    const topic = PublicKey.random();

    const peer1 = await setupSwarm({ topic });
    const peer2 = await setupSwarm({ topic });

    await connectSwarms(peer1, peer2, () => sleep(15));

    void peer1.swarm._peers.get(peer2.peer)!.connection!.close();
    void peer2.swarm.goOffline();

    const reconnectedPeer2 = await setupSwarm({ topic, peer: peer2.peer });

    await connectSwarms(peer1, reconnectedPeer2, () => sleep(15));
  });

  test('connection limiter', async () => {
    // remotePeer1 <--> peer (connectionLimiter: max = 1) <--> remotePeer2

    const localPeerInfo = { peerKey: '7701dc2d' };
    const remotePeerInfo1 = { peerKey: '7d2bc6aa' };
    const remotePeerInfo2 = { peerKey: '39ba0e41' };

    const topic = PublicKey.random();
    const connectionLimiter = new ConnectionLimiter({ maxConcurrentInitConnections: 1 });

    const signalManager = new MemorySignalManager(context);
    const sendOriginal = signalManager.sendMessage.bind(signalManager);
    const messages = new ComplexSet<{ author: PeerInfo; recipient: PeerInfo }>(
      ({ author, recipient }) => author.peerKey + recipient.peerKey,
    );
    signalManager.sendMessage = async (message) => {
      messages.add({ author: message.author, recipient: message.recipient });
      return sendOriginal(message);
    };
    // Stop signaling to stop connection in initiation state.
    signalManager.freeze();

    const peer = await setupSwarm({
      topic,
      peer: localPeerInfo,
      connectionLimiter,
      signalManager,
    });
    const remotePeer1 = await setupSwarm({ peer: remotePeerInfo1, topic });
    const remotePeer2 = await setupSwarm({ peer: remotePeerInfo2, topic });

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
      expect(messages.has({ author: localPeerInfo, recipient: remotePeerInfo1 })).to.equal(true);
      expect(messages.has({ author: localPeerInfo, recipient: remotePeerInfo2 })).to.equal(false);
    }

    signalManager.unfreeze();

    await Promise.all([connected1, connected2]);
  });
});

const connectSwarms = async (peer1: TestPeer, peer2: TestPeer, delay = async () => {}) => {
  const connect1 = peer1.swarm.connected.waitForCount(1);
  const connect2 = peer2.swarm.connected.waitForCount(1);

  void peer1.swarm.onSwarmEvent({
    topic: peer2.topic,
    peerAvailable: {
      peer: peer2.peer,
      since: new Date(),
    },
  });

  await delay();

  void peer2.swarm.onSwarmEvent({
    topic: peer1.topic,
    peerAvailable: {
      peer: peer1.peer,
      since: new Date(),
    },
  });

  if (
    !(
      peer1.swarm.connections.find((connection) => connection.remoteInfo.peerKey === peer2.peer.peerKey)?.state ===
      ConnectionState.CONNECTED
    )
  ) {
    await asyncTimeout(connect1, 3000);
  }
  if (
    !(
      peer2.swarm.connections.find((connection) => connection.remoteInfo.peerKey === peer1.peer.peerKey)?.state ===
      ConnectionState.CONNECTED
    )
  ) {
    await asyncTimeout(connect2, 3000);
  }

  await peer1.protocol.testConnection(PublicKey.from(peer2.peer.peerKey), 'test message 1');
  await peer2.protocol.testConnection(PublicKey.from(peer1.peer.peerKey), 'test message 2');
};
