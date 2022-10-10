//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { default as waitForExpect } from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { afterTest } from '@dxos/testutils';

import { NetworkManager } from './network-manager.js';
import { createProtocolFactory } from './protocol-factory.js';
import { FullyConnectedTopology } from './topology/index.js';
import { inMemoryTransportFactory } from './transport/index.js';

const signalContext = new MemorySignalManagerContext();

const createPeer = async (topic: PublicKey) => {
  const peerId = PublicKey.random();

  const networkManager = new NetworkManager({ signalManager: new MemorySignalManager(signalContext), transportFactory: inMemoryTransportFactory });
  afterTest(() => networkManager.destroy());

  const presencePlugin = new PresencePlugin(peerId.asBuffer());
  afterTest(() => presencePlugin.stop());

  await networkManager.joinProtocolSwarm({
    peerId,
    protocol: createProtocolFactory(topic, peerId, [presencePlugin]),
    topic,
    topology: new FullyConnectedTopology()
  });

  return { peerId, presence: presencePlugin, networkManager };
};

describe('Presence', function () {
  it('sees connected peers', async function () {
    const topic = PublicKey.random();
    const peer1 = await createPeer(topic);
    const peer2 = await createPeer(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map(key => key.toString('hex')).sort())
        .toEqual([peer1, peer2].map(key => key.peerId.toHex()).sort());

      expect(peer2.presence.peers.map(key => key.toString('hex')).sort())
        .toEqual([peer1, peer2].map(key => key.peerId.toHex()).sort());
    });
  });

  it('removes disconnected peers', async function () {
    const topic = PublicKey.random();
    const peer1 = await createPeer(topic);
    const peer2 = await createPeer(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map(key => key.toString('hex')).sort())
        .toEqual([peer1, peer2].map(key => key.peerId.toHex()).sort());
    });

    await peer2.networkManager.leaveProtocolSwarm(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map(key => key.toString('hex')).sort())
        .toEqual([peer1].map(x => x.peerId.toHex()).sort());
    });
  });
});
