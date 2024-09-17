//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { Connection } from './connection';
import { TestWireProtocol } from '../testing/test-wire-protocol';
import { createLibDataChannelTransportFactory, createSimplePeerTransportFactory } from '../transport';

describe('Connection', () => {
  test('initiator opens after responder', async () => {
    const [topic, sessionId] = PublicKey.randomSequence();
    const peer1 = { peerKey: PublicKey.random().toHex() };
    const peer2 = { peerKey: PublicKey.random().toHex() };
    const protocol1 = new TestWireProtocol(PublicKey.from(peer1.peerKey));
    const connection1 = new Connection(
      topic,
      peer1,
      peer2,
      sessionId,
      true,
      {
        offer: async (msg) => {
          return { accept: true };
        },
        signal: async (msg) => {
          await connection2.signal(msg);
        },
      },
      protocol1.factory({
        initiator: true,
        localPeerId: PublicKey.from(peer1.peerKey),
        remotePeerId: PublicKey.from(peer2.peerKey),
        topic,
      }),
      // TODO(nf): configure better
      process.env.MOCHA_ENV === 'nodejs' ? createLibDataChannelTransportFactory() : createSimplePeerTransportFactory(),
    );

    const protocol2 = new TestWireProtocol(PublicKey.from(peer2.peerKey));
    const connection2 = new Connection(
      topic,
      peer2,
      peer1,
      sessionId,
      false,
      {
        offer: async (msg) => {
          return { accept: true };
        },
        signal: async (msg) => {
          await connection1.signal(msg);
        },
      },
      protocol2.factory({
        initiator: false,
        localPeerId: PublicKey.from(peer2.peerKey),
        remotePeerId: PublicKey.from(peer1.peerKey),
        topic,
      }),
      // TODO(nf): configure better
      process.env.MOCHA_ENV === 'nodejs' ? createLibDataChannelTransportFactory() : createSimplePeerTransportFactory(),
    );

    connection2.initiate();
    await connection2.openConnection();
    await sleep(100);

    connection1.initiate();
    await connection1.openConnection();
    await Promise.all([
      protocol1.testConnection(PublicKey.from(peer2.peerKey), 'test message 1'),
      protocol2.testConnection(PublicKey.from(peer1.peerKey), 'test message 2'),
    ]);
  });
});
