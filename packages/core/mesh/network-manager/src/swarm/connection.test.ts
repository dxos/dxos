//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { TestWireProtocol } from '../testing/test-wire-protocol';
import { createRtcTransportFactory } from '../transport';
import { chooseInitiatorPeer } from '../transport/webrtc/utils';

import { Connection } from './connection';

// Segfault in node-datachannel.
describe.skip('Connection', () => {
  test('responder opens after initiator', async () => {
    const { initiator, responder } = createPeerKeys();
    await connectionTest({
      fastConnectionKey: initiator,
      slowConnectionKey: responder,
    });
  });

  test('initiator opens after responder', async () => {
    const { initiator, responder } = createPeerKeys();
    await connectionTest({
      fastConnectionKey: responder,
      slowConnectionKey: initiator,
    });
  });

  const connectionTest = async (setup: { fastConnectionKey: PublicKey; slowConnectionKey: PublicKey }) => {
    const [topic, sessionId] = PublicKey.randomSequence();
    const slowPeer = { peerKey: setup.slowConnectionKey.toHex() };
    const fastPeer = { peerKey: setup.fastConnectionKey.toHex() };

    const slowPeerProtocol = new TestWireProtocol();
    const slowConnection = new Connection(
      topic,
      slowPeer,
      fastPeer,
      sessionId,
      true,
      {
        offer: async (msg) => ({ accept: true }),
        signal: async (msg) => {
          await fastConnection.signal(msg);
        },
      },
      slowPeerProtocol.factory({
        initiator: true,
        localPeerId: PublicKey.from(slowPeer.peerKey),
        remotePeerId: PublicKey.from(fastPeer.peerKey),
        topic,
      }),
      createRtcTransportFactory(),
    );

    const fastPeerProtocol = new TestWireProtocol();
    const fastConnection = new Connection(
      topic,
      fastPeer,
      slowPeer,
      sessionId,
      false,
      {
        offer: async (msg) => ({ accept: true }),
        signal: async (msg) => {
          await slowConnection.signal(msg);
        },
      },
      fastPeerProtocol.factory({
        initiator: false,
        localPeerId: PublicKey.from(fastPeer.peerKey),
        remotePeerId: PublicKey.from(slowPeer.peerKey),
        topic,
      }),
      createRtcTransportFactory(),
    );

    fastConnection.initiate();
    await fastConnection.openConnection();
    await sleep(200);

    slowConnection.initiate();
    await slowConnection.openConnection();

    await Promise.all([
      slowPeerProtocol.testConnection(PublicKey.from(fastPeer.peerKey), 'test message 1'),
      fastPeerProtocol.testConnection(PublicKey.from(slowPeer.peerKey), 'test message 2'),
    ]);
  };

  const createPeerKeys = () => {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const initiator = PublicKey.fromHex(chooseInitiatorPeer(peer1.toHex(), peer2.toHex()));
    if (initiator.equals(peer1)) {
      return { initiator: peer1, responder: peer2 };
    } else {
      return { initiator: peer2, responder: peer1 };
    }
  };
});
