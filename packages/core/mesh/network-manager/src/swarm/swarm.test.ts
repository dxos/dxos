//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  Messenger,
  type PeerInfo,
  type SignalManager,
} from '@dxos/messaging';
import { fromDate, fromPublicKey } from '@dxos/protocols/buf';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import {
  type SwarmEvent,
  SwarmEvent_PeerAvailableSchema,
  SwarmEventSchema,
} from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { CloseSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { ComplexSet } from '@dxos/util';

import { TestWireProtocol } from '../testing/test-wire-protocol.ts';
import { FullyConnectedTopology } from '../topology/index.ts';
import {
  MemoryTransport,
  TRANSPORT_CONNECTION_TIMEOUT,
  type TransportFactory,
  createRtcTransportFactory,
} from '../transport/index.ts';
import { ConnectionLimiter } from './connection-limiter.ts';
import { ConnectionState } from './connection.ts';
import { Swarm } from './swarm.ts';

type TestPeer = {
  swarm: Swarm;
  peer: PeerInfo;
  protocol: TestWireProtocol;
  topic: PublicKey;
  signalManager: SignalManager;
};

const context = new MemorySignalManagerContext();

const setupSwarm = async ({
  topic = PublicKey.random(),
  peer = create(PeerSchema, { peerKey: PublicKey.random().toHex() }),
  connectionLimiter = new ConnectionLimiter(),
  signalManager = new MemorySignalManager(context),
  initiationDelay = 100,
  transportFactory = createRtcTransportFactory(),
}: {
  topic?: PublicKey;
  peer?: PeerInfo;
  connectionLimiter?: ConnectionLimiter;
  signalManager?: SignalManager;
  initiationDelay?: number;
  transportFactory?: TransportFactory;
}): Promise<TestPeer> => {
  const protocol = new TestWireProtocol();
  const swarm = new Swarm(
    topic,
    peer,
    new FullyConnectedTopology(),
    protocol.factory,
    new Messenger({ signalManager }),
    transportFactory,
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

// Segfault in node-datachannel.
describe.skip('Swarm', () => {
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

    const peerInfo1 = create(PeerSchema, { peerKey: '39ba0e42' });
    const peerInfo2 = create(PeerSchema, { peerKey: '7d2bc6ab' });

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

    const localPeerInfo = create(PeerSchema, { peerKey: '7701dc2d' });
    const remotePeerInfo1 = create(PeerSchema, { peerKey: '7d2bc6aa' });
    const remotePeerInfo2 = create(PeerSchema, { peerKey: '39ba0e41' });

    const topic = PublicKey.random();
    const connectionLimiter = new ConnectionLimiter({ maxConcurrentInitConnections: 1 });

    const signalManager = new MemorySignalManager(context);
    const sendOriginal = signalManager.sendMessage.bind(signalManager);
    const messages = new ComplexSet<{ author?: PeerInfo; recipient?: PeerInfo }>(
      ({ author, recipient }) => `${author?.peerKey}:${recipient?.peerKey}`,
    );
    signalManager.sendMessage = async (ctx, message) => {
      messages.add({ author: message.author, recipient: message.recipient });
      return sendOriginal(ctx, message);
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

describe('Swarm over a memory transport', () => {
  test(
    'a session one peer fails before connecting is retried without waiting out the transport timeout',
    { timeout: TRANSPORT_CONNECTION_TIMEOUT },
    async () => {
      const topic = PublicKey.random();
      let failed = false;
      const transportFactory: TransportFactory = {
        createTransport: (options) => {
          if (options.initiator || failed) {
            return new MemoryTransport(options);
          }
          failed = true;
          return new FailingTransport(options);
        },
      };

      const peer1 = await setupSwarm({ topic, transportFactory });
      const peer2 = await setupSwarm({ topic, transportFactory });
      await connectSwarms(peer1, peer2);
      expect(failed).toBe(true);
    },
  );
});

describe('Swarm over a memory transport, once connected', () => {
  test('a close for a session that already connected is ignored', async () => {
    const topic = PublicKey.random();
    const transportFactory: TransportFactory = { createTransport: (options) => new MemoryTransport(options) };
    const peer1 = await setupSwarm({ topic, transportFactory });
    const peer2 = await setupSwarm({ topic, transportFactory });
    await connectSwarms(peer1, peer2);

    const peer = peer1.swarm._peers.get(peer2.peer)!;
    const connection = peer.connection!;
    await peer.onClose(Context.default(), {
      author: peer2.peer,
      recipient: peer1.peer,
      topic,
      sessionId: connection.sessionId,
      data: { close: create(CloseSchema, { reason: 'transport closed' }) },
    });

    expect(connection.state).toBe(ConnectionState.CONNECTED);
    await peer1.protocol.testConnection(PublicKey.from(peer2.peer.peerKey), 'still connected');
  });
});

/** Fails on its first signal, as a WebRTC answerer does when it cannot apply the remote offer. */
class FailingTransport extends MemoryTransport {
  override async onSignal(): Promise<void> {
    this.errors.raise(new Error('Remote offer could not be applied.'));
  }
}

const peerAvailable = (topic: PublicKey, peer: PeerInfo): SwarmEvent =>
  create(SwarmEventSchema, {
    topic: fromPublicKey(topic),
    event: {
      case: 'peerAvailable',
      value: create(SwarmEvent_PeerAvailableSchema, { peer, since: fromDate(new Date()) }),
    },
  });

const connectSwarms = async (peer1: TestPeer, peer2: TestPeer, delay = async () => {}) => {
  const connect1 = peer1.swarm.connected.waitForCount(1);
  const connect2 = peer2.swarm.connected.waitForCount(1);

  void peer1.swarm.onSwarmEvent(peerAvailable(peer2.topic, peer2.peer));

  await delay();

  void peer2.swarm.onSwarmEvent(peerAvailable(peer1.topic, peer1.peer));

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
