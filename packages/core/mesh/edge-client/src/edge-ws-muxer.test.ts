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
import { EdgeConnectionClosedError } from './errors.ts';

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

  describe('segmented send into a closing socket', () => {
    // Bounds each case so a regression fails fast instead of hanging the suite.
    const SETTLE_TIMEOUT = 1_000;
    const largeContent = 'A'.repeat(MAX_CHUNK_LENGTH * 8);

    test.each([
      ['CLOSING', WS_CLOSING],
      ['CLOSED', WS_CLOSED],
    ])('rejects when the socket is already %s', async (_, readyState) => {
      const { muxer, socket, sentMessages } = await createMuxer();
      socket.readyState = readyState;

      await expect(settleWithin(muxer.send(textMessage(largeContent)), SETTLE_TIMEOUT)).rejects.toBeInstanceOf(
        EdgeConnectionClosedError,
      );
      expect(sentMessages).toHaveLength(0);
    });

    test('rejects when the socket closes mid-transfer', async () => {
      const { muxer, socket, sentMessages } = await createMuxer({
        onSend: (count) => {
          if (count === 2) {
            socket.readyState = WS_CLOSED;
          }
        },
      });

      await expect(settleWithin(muxer.send(textMessage(largeContent)), SETTLE_TIMEOUT)).rejects.toBeInstanceOf(
        EdgeConnectionClosedError,
      );
      expect(sentMessages).toHaveLength(2);
    });

    test('rejects sends queued behind the interrupted one', async () => {
      const { muxer, socket } = await createMuxer({
        onSend: (count) => {
          if (count === 1) {
            socket.readyState = WS_CLOSING;
          }
        },
      });

      const results = await settleWithin(
        Promise.allSettled([
          muxer.send(textMessage(largeContent)),
          muxer.send(textMessage(largeContent)),
          muxer.send(textMessage(largeContent, undefined, 'other-service')),
        ]),
        SETTLE_TIMEOUT,
      );
      for (const result of results) {
        expect(result.status).toBe('rejected');
        expect(result.status === 'rejected' && result.reason).toBeInstanceOf(EdgeConnectionClosedError);
      }
    });

    test('a later send on a reopened queue is not affected by the drained one', async () => {
      const { muxer, socket, sentMessages } = await createMuxer();
      socket.readyState = WS_CLOSED;
      await expect(settleWithin(muxer.send(textMessage(largeContent)), SETTLE_TIMEOUT)).rejects.toBeInstanceOf(
        EdgeConnectionClosedError,
      );

      // Nothing from the rejected send is retained to be flushed later.
      socket.readyState = WS_OPEN;
      await settleWithin(muxer.send(textMessage(largeContent)), SETTLE_TIMEOUT);
      const { muxer: receiver } = await createMuxer();
      const reassembled = sentMessages.map((chunk) => receiver.receiveData(chunk)).filter(Boolean);
      expect(reassembled).toHaveLength(1);
    });

    test('a fire-and-forget send rejected by close leaves no unhandled rejection, and destroy is idempotent', async () => {
      const { muxer, socket } = await createMuxer();
      socket.readyState = WS_CLOSED;
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', onUnhandled);
      try {
        // Mirrors `EdgeWsConnection.send`, which only attaches a `.catch`.
        const pending = muxer.send(textMessage(largeContent));
        pending.catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 50));
        muxer.destroy();
        muxer.destroy();
        await new Promise((resolve) => setTimeout(resolve, 50));
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
      expect(unhandled).toHaveLength(0);
    });
  });
});

const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

/** Rejects with a timeout instead of hanging when the promise never settles. */
const settleWithin = <T>(promise: Promise<T>, timeout: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`did not settle within ${timeout}ms`)), timeout);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
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

const textMessage = (message: string, source?: EdgeIdentity, serviceId = 'test-service') =>
  protocol.createMessage(TextMessageSchema, {
    source: source && { peerKey: source.peerKey, identityDid: source.identityDid },
    serviceId,
    payload: { message },
  });

const createMuxer = async ({ onSend }: { onSend?: (sentCount: number) => void } = {}) => {
  const sentMessages: Uint8Array[] = [];
  const socket = {
    readyState: WS_OPEN,
    send: (message: string) => {
      sentMessages.push(Buffer.from(message));
      onSend?.(sentMessages.length);
    },
  };
  const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
  return { muxer, socket, sentMessages };
};
