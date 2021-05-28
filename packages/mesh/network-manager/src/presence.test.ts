//
// Copyright 2021 DXOS.org
//

import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/crypto';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';

import { NetworkManager } from './network-manager';
import { protocolFactory } from './protocol-factory';
import { afterTest } from './testutils';
import { FullyConnectedTopology } from './topology';

const createPeer = (topic: PublicKey) => {
  const peerId = PublicKey.random();

  const networkManager = new NetworkManager();
  afterTest(() => networkManager.destroy());

  const presencePlugin = new PresencePlugin(peerId.asBuffer());

  const protocol = protocolFactory({
    getTopics: () => {
      return [topic.asBuffer()];
    },
    session: { peerId: peerId.asBuffer() },
    plugins: [presencePlugin]
  });

  networkManager.joinProtocolSwarm({
    peerId,
    protocol,
    topic,
    topology: new FullyConnectedTopology()
  });

  return { peerId, presence: presencePlugin, networkManager };
};

test('presence', async () => {
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
