//
// Copyright 2024 DXOS.org
//

import { describe, test, onTestFinished } from 'vitest';

import { createEphemeralEdgeIdentity, EdgeClient } from '@dxos/edge-client';
import { PublicKey } from '@dxos/keys';
import { EdgeSignalManager, MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';

import { SwarmNetworkManager } from '../network-manager';
import { TestWireProtocol } from '../testing/test-wire-protocol';
import { FullyConnectedTopology } from '../topology';
import { MemoryTransportFactory } from '../transport';

describe('EdgeSignaling', () => {
  test.skip('join swarm and exchange messages with memory signaling', async () => {
    const signalingContext = new MemorySignalManagerContext();
    const createPeer = async () => {
      const peerId = PublicKey.random();

      const networkManager = new SwarmNetworkManager({
        transportFactory: MemoryTransportFactory,
        signalManager: new MemorySignalManager(signalingContext),
        peerInfo: { peerKey: peerId.toHex() },
      });

      await networkManager.open();
      onTestFinished(async () => {
        await networkManager.close();
      });

      const protocol = new TestWireProtocol(peerId);
      return { peerId, networkManager, protocol };
    };

    const topic = PublicKey.random();
    const peer1 = await createPeer();
    const peer2 = await createPeer();

    await peer1.networkManager.joinSwarm({
      topic,
      topology: new FullyConnectedTopology(),
      protocolProvider: peer1.protocol.factory,
    });

    await peer2.networkManager.joinSwarm({
      topic,
      topology: new FullyConnectedTopology(),
      protocolProvider: peer2.protocol.factory,
    });

    await peer1.protocol.testConnection(peer2.peerId, 'Hello, World!');
    await peer2.protocol.testConnection(peer1.peerId, 'Hello, World!');
  });

  test('join swarm and exchange messages', async () => {
    const createPeer = async () => {
      const edgeIdentity = await createEphemeralEdgeIdentity();
      const edgeConnection = new EdgeClient(edgeIdentity, { socketEndpoint: 'ws://localhost:8787' });
      await edgeConnection.open();
      onTestFinished(async () => {
        await edgeConnection.close();
      });
      const signalManager = new EdgeSignalManager({ edgeConnection });

      const networkManager = new SwarmNetworkManager({
        transportFactory: MemoryTransportFactory,
        signalManager,
        peerInfo: { peerKey: edgeIdentity.peerKey, identityKey: edgeIdentity.identityKey },
      });

      await networkManager.open();
      onTestFinished(async () => {
        await networkManager.close();
      });

      const peerId = PublicKey.from(edgeIdentity.peerKey);
      const protocol = new TestWireProtocol(peerId);
      return { peerId, networkManager, protocol };
    };

    const topic = PublicKey.random();
    const peer1 = await createPeer();
    const peer2 = await createPeer();

    await peer1.networkManager.joinSwarm({
      topic,
      topology: new FullyConnectedTopology(),
      protocolProvider: peer1.protocol.factory,
    });

    await peer2.networkManager.joinSwarm({
      topic,
      topology: new FullyConnectedTopology(),
      protocolProvider: peer2.protocol.factory,
    });

    await peer1.protocol.testConnection(peer2.peerId, 'Hello, World!');
    await peer2.protocol.testConnection(peer1.peerId, 'Hello, World!');
  });

  test('join swarm and one change identity', async () => {
    const createPeer = async () => {
      const edgeIdentity = await createEphemeralEdgeIdentity();
      const edgeConnection = new EdgeClient(edgeIdentity, { socketEndpoint: 'ws://localhost:8787' });
      await edgeConnection.open();
      onTestFinished(async () => {
        await edgeConnection.close();
      });
      const signalManager = new EdgeSignalManager({ edgeConnection });

      const networkManager = new SwarmNetworkManager({
        transportFactory: MemoryTransportFactory,
        signalManager,
        peerInfo: { peerKey: edgeIdentity.peerKey, identityKey: edgeIdentity.identityKey },
      });

      await networkManager.open();
      onTestFinished(async () => {
        await networkManager.close();
      });

      const peerId = PublicKey.from(edgeIdentity.peerKey);
      const protocol = new TestWireProtocol(peerId);
      return { peerId, networkManager, protocol, edgeConnection };
    };

    const topic = PublicKey.random();
    const peer1 = await createPeer();
    const peer2 = await createPeer();

    await peer1.networkManager.joinSwarm({
      topic,
      topology: new FullyConnectedTopology(),
      protocolProvider: peer1.protocol.factory,
    });

    // Change identity.
    {
      const edgeIdentity = await createEphemeralEdgeIdentity();
      peer1.edgeConnection.setIdentity(edgeIdentity);
      peer1.networkManager.setPeerInfo({ peerKey: edgeIdentity.peerKey, identityKey: edgeIdentity.identityKey });
    }

    await peer2.networkManager.joinSwarm({
      topic,
      topology: new FullyConnectedTopology(),
      protocolProvider: peer2.protocol.factory,
    });

    await peer1.protocol.testConnection(peer2.peerId, 'Hello, World!');
    await peer2.protocol.testConnection(peer1.peerId, 'Hello, World!');
  });
});
