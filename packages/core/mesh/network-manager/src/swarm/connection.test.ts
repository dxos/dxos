//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { TestWireProtocol } from '../testing/test-wire-protocol';
import { createWebRTCTransportFactory } from '../transport';
import { Connection } from './connection';

describe('Connection', () => {
  test('initiator opens after responder', async () => {
    const [topic, peerId1, peerId2, sessionId] = PublicKey.randomSequence();
    const connection1 = new Connection(
      topic,
      peerId1,
      peerId2,
      sessionId,
      true,
      {
        offer: async (msg) => {
          log.info('offer', { msg });

          return { accept: true };
        },
        signal: async (msg) => {
          await connection2.signal(msg);
        },
      },
      new TestWireProtocol(peerId1).factory({ initiator: true, localPeerId: peerId1, remotePeerId: peerId2, topic }),
      createWebRTCTransportFactory(),
    );

    const connection2 = new Connection(
      topic,
      peerId2,
      peerId1,
      sessionId,
      false,
      {
        offer: async (msg) => {
          log.info('offer', { msg });

          return { accept: true };
        },
        signal: async (msg) => {
          await connection1.signal(msg);
        },
      },
      new TestWireProtocol(peerId1).factory({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1, topic }),
      createWebRTCTransportFactory(),
    );
  });
});
