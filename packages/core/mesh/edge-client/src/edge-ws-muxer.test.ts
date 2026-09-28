//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { bufWkt } from '@dxos/protocols/buf';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs.ts';
import type { EdgeIdentity } from './edge-identity.ts';
import {
  MAX_INBOUND_CHUNK_COUNT,
  MAX_INBOUND_MESSAGE_BYTES,
  SegmentedMessageLimitError,
  WebSocketMuxer,
} from './edge-ws-muxer.ts';

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

  test('unterminated sequence is capped by chunk count', async () => {
    const { muxer } = await createMuxer();
    const chunk = segmentChunk(new Uint8Array(0));

    for (let i = 0; i < MAX_INBOUND_CHUNK_COUNT; i++) {
      expect(muxer.receiveData(chunk)).toBeUndefined();
    }

    expect(() => muxer.receiveData(chunk)).toThrow(SegmentedMessageLimitError);
    // The accumulator is released, so the channel starts a fresh sequence.
    expect(muxer.receiveData(chunk)).toBeUndefined();
  });

  test('a first chunk is bounded like any other', async () => {
    const { muxer } = await createMuxer();
    const oversized = segmentChunk(new Uint8Array(MAX_INBOUND_MESSAGE_BYTES + 1));

    expect(() => muxer.receiveData(oversized)).toThrow(SegmentedMessageLimitError);
    // Nothing was retained, so a well-sized sequence still starts on the channel.
    expect(muxer.receiveData(segmentChunk(new Uint8Array(1)))).toBeUndefined();
  });

  test('unterminated sequence is capped by accumulated bytes', async () => {
    const { muxer } = await createMuxer();
    const chunkBytes = Math.ceil(MAX_INBOUND_MESSAGE_BYTES / 8);
    const chunk = segmentChunk(new Uint8Array(chunkBytes));

    let thrown: unknown;
    for (let i = 0; i < 16; i++) {
      try {
        muxer.receiveData(chunk);
      } catch (error) {
        thrown = error;
        break;
      }
    }

    expect(thrown).toBeInstanceOf(SegmentedMessageLimitError);
    expect((thrown as SegmentedMessageLimitError).byteLength).toBeGreaterThan(MAX_INBOUND_MESSAGE_BYTES);
  });
});

const CHANNEL_ID = 1;

/** A non-terminating chunk of a segmented sequence on {@link CHANNEL_ID}. */
const segmentChunk = (payload: Uint8Array) => {
  const data = new Uint8Array(2 + payload.byteLength);
  data[0] = 1; // FLAG_SEGMENT_SEQ.
  data[1] = CHANNEL_ID;
  data.set(payload, 2);
  return data;
};

const textMessage = (message: string, source?: EdgeIdentity) =>
  protocol.createMessage(TextMessageSchema, {
    source: source && { peerKey: source.peerKey, identityDid: source.identityDid },
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
