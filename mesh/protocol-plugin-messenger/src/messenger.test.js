//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import waitForExpect from 'wait-for-expect';

import { Protocol } from '@dxos/protocol';
import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';

import { Messenger } from '.';

jest.setTimeout(30000);

const random = arr => arr[Math.floor(Math.random() * arr.length)];

const generator = new ProtocolNetworkGenerator((topic, peerId) => {
  const messages = [];
  const chat = new Messenger(peerId, (protocol, { type, payload }) => {
    messages.push(`${type}:${payload.toString()}`);
  });

  return {
    id: peerId,
    chat,
    messages,
    createStream () {
      return new Protocol({
        streamOptions: {
          live: true
        }
      })
        .setSession({ peerId })
        .setExtensions([chat.createExtension()])
        .init(topic)
        .stream;
    }
  };
});

describe.skip('test peer chat in a network graph of 15 peers', () => {
  test('feed synchronization', async () => {
    const topic = crypto.randomBytes(32);

    const network = await generator.balancedBinTree({
      topic,
      parameters: [3]
    });

    const { peers } = network;

    expect(peers.reduce((prev, curr) => prev && curr.chat.peers.length > 0, true)).toBe(true);

    const peer1 = random(peers);
    let peer2 = random(peer1.chat.peers);
    peer2 = peers.find(p => p.id.equals(peer2));

    peer1.chat.sendMessage(peer2.id, 'general', Buffer.from('ping'));

    await waitForExpect(() => {
      expect(peer2.messages).toEqual(['general:ping']);
    });

    peer2.messages.length = 0;

    await peer1.chat.broadcastMessage('general', Buffer.from('ping'));

    await waitForExpect(() => {
      peers.forEach(peer => {
        if (peer === peer1) {
          return;
        }
        expect(peer.messages).toEqual(['general:ping']);
      });
    }, 10000, 5000);

    peers.forEach(peer => peer.chat._broadcast.stop());

    await network.destroy();

    await waitForExpect(() => {
      expect(peers.reduce((prev, curr) => {
        return prev && curr.chat.peers.length === 0;
      }, true)).toBe(true);
    }, 5000, 1000);
  });
});
