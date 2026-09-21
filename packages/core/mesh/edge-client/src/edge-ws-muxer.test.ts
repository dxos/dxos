//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { bufWkt } from '@dxos/protocols/buf';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs.ts';
import type { EdgeIdentity } from './edge-identity.ts';
import { type FlowControlConfig, WebSocketMuxer } from './edge-ws-muxer.ts';

const MAX_CHUNK_LENGTH = 16;
/** Two chunks is the floor the muxer enforces, so the smallest window that can make progress. */
const WINDOW = MAX_CHUNK_LENGTH * 4;
/** Comfortably above a minimal message's protobuf overhead, so "short" means one frame. */
const SHORT_MESSAGE_CHUNK = 256;

describe('WebSocketMuxer', () => {
  test('basic message reassembly', async () => {
    const { muxer: muxer1, sentMessages } = createMuxer();
    const { muxer: muxer2 } = createMuxer();
    const content = 'A'.repeat(MAX_CHUNK_LENGTH);
    await muxer1.send(textMessage(content));

    expect(sentMessages.length).toBeGreaterThan(1);
    for (const chunk of sentMessages.slice(0, -1)) {
      expect(muxer2.receiveData(chunk).message).toBeUndefined();
    }

    const { message } = muxer2.receiveData(sentMessages.at(-1)!);
    expect(message).toBeDefined();
    expect(bufWkt.anyUnpack(message!.payload!, TextMessageSchema)?.message).toStrictEqual(content);
  });

  test('without flow control a short message stays unsegmented', async () => {
    const { muxer, sentMessages } = createMuxer({ maxChunkLength: SHORT_MESSAGE_CHUNK });
    await muxer.send(textMessage('hi'));

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]![0]).toBe(0);
  });

  describe('flow control', () => {
    test('every message is segment-framed so it can be accounted', async () => {
      const { muxer, sentMessages } = createMuxer({
        flowControl: flowControl(),
        maxChunkLength: SHORT_MESSAGE_CHUNK,
      });
      void muxer.send(textMessage('hi'));
      await flush();

      expect(sentMessages).toHaveLength(1);
      // Segment + terminator, never the unsegmented shape.
      expect(sentMessages[0]![0]).toBe(0b11);
    });

    test('a message with no service id rides the reserved channel 0', async () => {
      const { muxer, sentMessages } = createMuxer({
        flowControl: flowControl(),
        maxChunkLength: SHORT_MESSAGE_CHUNK,
      });
      void muxer.send(protocol.createMessage(TextMessageSchema, { payload: { message: 'hi' } }));
      await flush();

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]![1]).toBe(0);
    });

    test('the sender stalls at the window and a grant resumes it', async () => {
      const { muxer, sentMessages } = createMuxer({ flowControl: flowControl() });
      // Comfortably more than the window, so the stall is not an artefact of message size.
      void muxer.send(textMessage('A'.repeat(WINDOW * 4)));
      await flush();

      const sentBytes = payloadBytes(sentMessages);
      expect(sentBytes).toBeLessThanOrEqual(WINDOW);
      expect(sentBytes).toBeGreaterThan(WINDOW - MAX_CHUNK_LENGTH);
      expect(muxer.inFlightBytes(1)).toBe(sentBytes);

      const before = sentMessages.length;
      muxer.receiveData(grant(1, sentBytes));
      await flush();

      expect(sentMessages.length).toBeGreaterThan(before);
      expect(payloadBytes(sentMessages) - sentBytes).toBeLessThanOrEqual(WINDOW);
    });

    test('a stalled channel does not block another', async () => {
      const { muxer, sentMessages } = createMuxer({ flowControl: flowControl() });
      void muxer.send(textMessage('A'.repeat(WINDOW * 4), 'service-a'));
      await flush();
      expect(payloadBytes(sentMessages)).toBeLessThanOrEqual(WINDOW);

      // The second service gets its own channel and its own window, so it flows while the first
      // is stalled -- the whole point of per-channel credit over a per-socket watermark.
      void muxer.send(textMessage('B'.repeat(MAX_CHUNK_LENGTH * 2), 'service-b'));
      await flush();

      const channelB = sentMessages.filter((frame) => frame[1] === 2);
      expect(channelB.length).toBeGreaterThan(0);
    });

    test('a grant frame encodes cumulative consumption', async () => {
      const { muxer, sentMessages } = createMuxer({ flowControl: flowControl() });
      // Consumption below the threshold is not announced; grants are cumulative, so skipping is free.
      muxer.consumed(3, 1);
      expect(sentMessages).toHaveLength(0);

      muxer.consumed(3, WINDOW);
      expect(sentMessages).toHaveLength(1);
      const frame = sentMessages[0]!;
      expect(frame[0]).toBe(0b100);
      expect(frame[1]).toBe(3);
      expect(new DataView(frame.buffer, frame.byteOffset, frame.byteLength).getUint32(2)).toBe(WINDOW + 1);
    });

    test('a peer that ignores grants trips the overdraft bound', async () => {
      const overdrafts: number[] = [];
      const { muxer } = createMuxer({
        flowControl: flowControl({ onOverdraft: ({ channelId }) => overdrafts.push(channelId) }),
      });

      const chunk = new Uint8Array(2 + MAX_CHUNK_LENGTH);
      chunk[0] = 0b01;
      chunk[1] = 7;
      // Tolerance is 1.5x, so the window alone must not trip it.
      for (let sent = 0; sent < WINDOW; sent += MAX_CHUNK_LENGTH) {
        muxer.receiveData(chunk);
      }
      expect(overdrafts).toHaveLength(0);

      for (let sent = 0; sent < WINDOW; sent += MAX_CHUNK_LENGTH) {
        muxer.receiveData(chunk);
      }
      expect(overdrafts).toContain(7);
    });

    test('consuming inbound bytes clears the overdraft', async () => {
      const overdrafts: number[] = [];
      const { muxer } = createMuxer({
        flowControl: flowControl({ onOverdraft: ({ channelId }) => overdrafts.push(channelId) }),
      });

      const chunk = new Uint8Array(2 + MAX_CHUNK_LENGTH);
      chunk[0] = 0b01;
      chunk[1] = 7;
      for (let sent = 0; sent < WINDOW * 2; sent += MAX_CHUNK_LENGTH) {
        muxer.consumed(7, MAX_CHUNK_LENGTH);
        muxer.receiveData(chunk);
      }

      expect(overdrafts).toHaveLength(0);
    });
  });
});

const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/** Payload bytes across data frames, excluding the 2-byte framing header and any grant frames. */
const payloadBytes = (frames: Uint8Array[]) =>
  frames.filter((frame) => (frame[0]! & 0b100) === 0).reduce((total, frame) => total + frame.byteLength - 2, 0);

const grant = (channelId: number, consumed: number): Uint8Array => {
  const frame = new Uint8Array(6);
  frame[0] = 0b100;
  frame[1] = channelId;
  new DataView(frame.buffer).setUint32(2, consumed);
  return frame;
};

const flowControl = (overrides?: Partial<FlowControlConfig>): FlowControlConfig => ({
  windowFor: () => WINDOW,
  ...overrides,
});

const textMessage = (message: string, serviceId = 'test-service', source?: EdgeIdentity) =>
  protocol.createMessage(TextMessageSchema, {
    source: source && { peerKey: source.peerKey, identityDid: source.identityDid },
    serviceId,
    payload: { message },
  });

const createMuxer = (config?: { flowControl?: FlowControlConfig; maxChunkLength?: number }) => {
  const sentMessages: Uint8Array[] = [];
  const muxer = new WebSocketMuxer(
    {
      readyState: 1,
      send: (message: any) => {
        sentMessages.push(message instanceof Uint8Array ? message : Buffer.from(message));
      },
    },
    { maxChunkLength: MAX_CHUNK_LENGTH, ...config },
  );
  return { muxer, sentMessages };
};
