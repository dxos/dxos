//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { bufWkt } from '@dxos/protocols/buf';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import type { EdgeIdentity } from './edge-identity';
import { WebSocketMuxer } from './edge-ws-muxer';

const MAX_CHUNK_LENGTH = 16;

describe('WebSocketMuxerTest', () => {
  test('basic message reassembly', async () => {
    const { muxer: muxer1, sentMessages } = await createMuxer();
    const { muxer: muxer2 } = await createMuxer();
    const content = 'A'.repeat(MAX_CHUNK_LENGTH);
    await muxer1.send(textMessage(content));

    expect(sentMessages.length).toBeGreaterThan(1);
    for (const chunk of sentMessages.slice(0, -1)) {
      expect(muxer2.receiveData(chunk)).toBeUndefined();
    }

    const reassembledMessage = muxer2.receiveData(sentMessages.at(-1)!)!;
    expect(reassembledMessage).toBeDefined();

    const decoded = bufWkt.anyUnpack(reassembledMessage.payload!, TextMessageSchema);
    expect(decoded?.message).toStrictEqual(content);
  });
});

const textMessage = (message: string, source?: EdgeIdentity) =>
  protocol.createMessage(TextMessageSchema, {
    source: source && { peerKey: source.peerKey, identityKey: source.identityKey },
    serviceId: 'test-service',
    payload: { message },
  });

const createMuxer = async () => {
  const sentMessages: Uint8Array[] = [];
  const muxer = new WebSocketMuxer(
    {
      readyState: 1,
      send: (message: string) => {
        sentMessages.push(Buffer.from(message));
      },
    },
    { maxChunkLength: MAX_CHUNK_LENGTH },
  );
  return { muxer, sentMessages };
};
