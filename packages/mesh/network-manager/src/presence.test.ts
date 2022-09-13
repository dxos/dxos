//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { createMemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { PublicKey } from '@dxos/protocols';
import { afterTest } from '@dxos/testutils';

import { NetworkManager } from './network-manager';
import { createProtocolFactory } from './protocol-factory';
import { FullyConnectedTopology } from './topology';

const singletonContext = createMemorySignalManagerContext();
const createSignalManager = () => new MemorySignalManager(singletonContext);

const createPeer = (topic: PublicKey) => {
  const peerId = PublicKey.random();

  const networkManager = new NetworkManager({ signalManager: createSignalManager() });
  afterTest(() => networkManager.destroy());

  const presencePlugin = new PresencePlugin(peerId.asBuffer());
  afterTest(() => presencePlugin.stop());

  networkManager.joinProtocolSwarm({
    peerId,
    protocol: createProtocolFactory(topic, peerId, [presencePlugin]),
    topic,
    topology: new FullyConnectedTopology()
  });

  return { peerId, presence: presencePlugin, networkManager };
};

describe('Presence', () => {
  it('sees connected peers', async () => {
    const topic = PublicKey.random();

    const peer1 = createPeer(topic);
    const peer2 = createPeer(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map(x => x.toString('hex')).sort())
        .toEqual([peer1, peer2].map(x => x.peerId.toHex()).sort());

      expect(peer2.presence.peers.map(x => x.toString('hex')).sort())
        .toEqual([peer1, peer2].map(x => x.peerId.toHex()).sort());
    });
  });

  it('removes disconnected peers', async () => {
    const topic = PublicKey.random();

    const peer1 = createPeer(topic);
    const peer2 = createPeer(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map(x => x.toString('hex')).sort())
        .toEqual([peer1, peer2].map(x => x.peerId.toHex()).sort());
    });

    await peer2.networkManager.leaveProtocolSwarm(topic);

    await waitForExpect(() => {
      expect(peer1.presence.peers.map(x => x.toString('hex')).sort())
        .toEqual([peer1].map(x => x.peerId.toHex()).sort());
    });
  });
});
