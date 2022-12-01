//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { describe, test, afterTest } from '@dxos/test';

import { NetworkManager } from '../network-manager';
import { createProtocolFactory } from '../protocol-factory';
import { FullyConnectedTopology } from '../topology';
import { MemoryTransportFactory } from '../transport';
import { adaptProtocolProvider } from '../wire-protocol';

const signalContext = new MemorySignalManagerContext();

// TODO(burdon): Move to TestBuilder (configure plugins).
const createPeer = async (topic: PublicKey) => {
  const peerId = PublicKey.random();

  const networkManager = new NetworkManager({
    signalManager: new MemorySignalManager(signalContext),
    transportFactory: MemoryTransportFactory
  });
  afterTest(() => networkManager.close());

  const presencePlugin = new PresencePlugin(peerId.asBuffer());
  afterTest(() => presencePlugin.stop());

  await networkManager.joinSwarm({
    peerId,
    protocolProvider: adaptProtocolProvider(createProtocolFactory(topic, peerId, [presencePlugin])),
    topic,
    topology: new FullyConnectedTopology()
  });

  return { peerId, presence: presencePlugin, networkManager };
};

describe('Presence', () => {
  test('detects connected peers', async () => {
    // TODO(burdon): Configure plugins.
    // const testBuilder = new TestBuilder();
    // const peer1 = testBuilder.createPeer();
    // const peer2 = testBuilder.createPeer();

    const topic = PublicKey.random();
    const peer1 = await createPeer(topic);
    const peer2 = await createPeer(topic);
    // await peer1.joinSwarm(topic);
    // await peer2.joinSwarm(topic);

    // TODO(burdon): Use triggers instead of waitForExpect.
    await waitForExpect(() => {
      expect(peer1.presence.peers.map((key) => key.toString('hex')).sort()).to.deep.eq(
        [peer1, peer2].map((key) => key.peerId.toHex()).sort()
      );

      expect(peer2.presence.peers.map((key) => key.toString('hex')).sort()).to.deep.eq(
        [peer1, peer2].map((key) => key.peerId.toHex()).sort()
      );
    });

    await peer2.networkManager.leaveSwarm(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map((key) => key.toString('hex')).sort()).to.deep.eq(
        [peer1].map((key) => key.peerId.toHex()).sort()
      );

      expect(peer2.presence.peers.map((key) => key.toString('hex')).sort()).to.deep.eq(
        [peer2].map((key) => key.peerId.toHex()).sort()
      );
    });
  });
});
