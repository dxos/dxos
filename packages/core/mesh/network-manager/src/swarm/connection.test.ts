//
// Copyright 2023 DXOS.org
//

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { TestWireProtocol } from '../testing/test-wire-protocol';
import { createWebRTCTransportFactory } from '../transport';
import { Connection } from './connection';

describe('Connection', () => {
  test('initiator opens after responder', async () => {
    const [topic, peerId1, peerId2, sessionId] = PublicKey.randomSequence();
    const protocol1 = new TestWireProtocol(peerId1);
    const connection1 = new Connection(
      topic,
      peerId1,
      peerId2,
      sessionId,
      true,
      {
        offer: async (msg) => {
          log('offer', { msg });

          return { accept: true };
        },
        signal: async (msg) => {
          await connection2.signal(msg);
        },
      },
      protocol1.factory({
        initiator: true,
        localPeerId: peerId1,
        remotePeerId: peerId2,
        topic,
      }),
      createWebRTCTransportFactory(),
    );

    const protocol2 = new TestWireProtocol(peerId2);
    const connection2 = new Connection(
      topic,
      peerId2,
      peerId1,
      sessionId,
      false,
      {
        offer: async (msg) => {
          log('offer', { msg });

          return { accept: true };
        },
        signal: async (msg) => {
          await connection1.signal(msg);
        },
      },
      protocol2.factory({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1, topic }),
      createWebRTCTransportFactory(),
    );

    await connection2.openConnection();
    await sleep(100);
    await connection1.openConnection();
    await Promise.all([
      protocol1.testConnection(peerId2, 'test message 1'),
      protocol2.testConnection(peerId1, 'test message 2'),
    ]);
  });
});
