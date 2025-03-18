//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { Connection } from './connection';
import { TestWireProtocol } from '../testing/test-wire-protocol';
import { createRtcTransportFactory } from '../transport';
import { chooseInitiatorPeer } from '../transport/webrtc/utils';

describe('Connection', () => {
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
    const [swarmKey, sessionId] = PublicKey.randomSequence().map(PublicKey.hash);
    const slowPeer = { peerKey: setup.slowConnectionKey.toHex() };
    const fastPeer = { peerKey: setup.fastConnectionKey.toHex() };

    const slowPeerProtocol = new TestWireProtocol();
    const slowConnection = new Connection(
      swarmKey,
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
        localPeerId: slowPeer.peerKey,
        remotePeerId: fastPeer.peerKey,
        swarmKey,
      }),
      createRtcTransportFactory(),
    );

    const fastPeerProtocol = new TestWireProtocol();
    const fastConnection = new Connection(
      swarmKey,
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
        localPeerId: fastPeer.peerKey,
        remotePeerId: slowPeer.peerKey,
        swarmKey,
      }),
      createRtcTransportFactory(),
    );

    fastConnection.initiate();
    await fastConnection.openConnection();
    await sleep(200);

    slowConnection.initiate();
    await slowConnection.openConnection();

    await Promise.all([
      slowPeerProtocol.testConnection(fastPeer.peerKey, 'test message 1'),
      fastPeerProtocol.testConnection(slowPeer.peerKey, 'test message 2'),
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
