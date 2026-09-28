//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { buf, bufWkt } from '@dxos/protocols/buf';
import { type Message, MessageSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { concatUint8Arrays, isNonNullable } from '@dxos/util';

import { protocol } from './defs.ts';
import {
  CLOUDFLARE_MESSAGE_MAX_BYTES,
  MAX_INBOUND_CHUNK_COUNT,
  MAX_INBOUND_MESSAGE_BYTES,
  MessageTooLargeError,
  SegmentedMessageLimitError,
  WebSocketClosedError,
  WebSocketMuxer,
} from './edge-ws-muxer.ts';

const MAX_CHUNK_LENGTH = 16;
const SEGMENTED_CONTENT = 'A'.repeat(4 * MAX_CHUNK_LENGTH);

// Wire format, restated so a change to the muxer's own constants cannot pass unnoticed.
const CHANNEL_ID = 1;
const FLAG_SEGMENT_SEQ = 1;
const FLAG_SEGMENT_SEQ_TERMINATED = 2;
const WIRE_SEGMENT_BYTES = 16_384;

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

// The muxer waits once the socket buffers this much.
const SOCKET_BUFFER_FULL = 1_000_000;

describe('WebSocketMuxerTest', () => {
  test('basic message reassembly', async ({ expect }) => {
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

  test('unterminated sequence is capped by chunk count', async ({ expect }) => {
    const { muxer } = await createMuxer();
    const chunk = segmentChunk(new Uint8Array(0));

    for (let i = 0; i < MAX_INBOUND_CHUNK_COUNT; i++) {
      expect(muxer.receiveData(chunk)).toBeUndefined();
    }

    expect(() => muxer.receiveData(chunk)).toThrow(SegmentedMessageLimitError);
    // The accumulator is released, so the channel starts a fresh sequence.
    expect(muxer.receiveData(chunk)).toBeUndefined();
  });

  test('a first chunk is bounded like any other', async ({ expect }) => {
    const { muxer } = await createMuxer();
    const oversized = segmentChunk(new Uint8Array(MAX_INBOUND_MESSAGE_BYTES + 1));

    expect(() => muxer.receiveData(oversized)).toThrow(SegmentedMessageLimitError);
    // Nothing was retained, so a well-sized sequence still starts on the channel.
    expect(muxer.receiveData(segmentChunk(new Uint8Array(1)))).toBeUndefined();
  });

  test('unterminated sequence is capped by accumulated bytes', async ({ expect }) => {
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

  test('frames a segmented message as flags, channel and 16 KiB segments', async ({ expect }) => {
    const socket = new TestSocket();
    const muxer = new WebSocketMuxer(socket);
    const large = textMessage('A'.repeat(2 * WIRE_SEGMENT_BYTES + 1_000));
    const small = textMessage('small');
    await muxer.send(large);
    await muxer.send(small);

    expect(socket.frames).toHaveLength(4);
    const [first, second, last, unsegmented] = socket.frames;
    expect([first[0], second[0], last[0]]).toEqual([
      FLAG_SEGMENT_SEQ,
      FLAG_SEGMENT_SEQ,
      FLAG_SEGMENT_SEQ | FLAG_SEGMENT_SEQ_TERMINATED,
    ]);
    expect([first[1], second[1], last[1]]).toEqual([CHANNEL_ID, CHANNEL_ID, CHANNEL_ID]);
    expect([first.byteLength, second.byteLength]).toEqual([2 + WIRE_SEGMENT_BYTES, 2 + WIRE_SEGMENT_BYTES]);
    expect(concatUint8Arrays([first, second, last].map((frame) => frame.subarray(2)))).toEqual(
      buf.toBinary(MessageSchema, large),
    );
    expect(unsegmented[0]).toBe(0);
    expect(unsegmented.subarray(1)).toEqual(buf.toBinary(MessageSchema, small));

    const receiver = new WebSocketMuxer(new TestSocket());
    const received = socket.frames.map((frame) => receiver.receiveData(frame)).filter(isNonNullable);
    expect(received.map(textOf)).toEqual([textOf(large), 'small']);
  });

  for (const [state, readyState] of [
    ['closing', WS_CLOSING],
    ['closed', WS_CLOSED],
  ] as const) {
    test(`rejects a send on a ${state} socket without writing it`, async ({ expect }) => {
      const socket = new TestSocket();
      socket.readyState = readyState;
      const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });

      await expect(muxer.send(unsegmentedMessage('small'))).rejects.toBeInstanceOf(WebSocketClosedError);
      await expect(muxer.send(textMessage(SEGMENTED_CONTENT))).rejects.toBeInstanceOf(WebSocketClosedError);
      expect(() => muxer.sendSync(textMessage(SEGMENTED_CONTENT))).toThrow(WebSocketClosedError);
      expect(socket.frames).toHaveLength(0);
    });
  }

  test('rejects a message over the size limit instead of dropping it', async ({ expect }) => {
    const socket = new TestSocket();
    const muxer = new WebSocketMuxer(socket);
    const content = 'A'.repeat(CLOUDFLARE_MESSAGE_MAX_BYTES);

    await expect(muxer.send(unsegmentedMessage(content))).rejects.toBeInstanceOf(MessageTooLargeError);
    expect(() => muxer.sendSync(unsegmentedMessage(content))).toThrow(MessageTooLargeError);
    expect(socket.frames).toHaveLength(0);

    // With a service id the same content is segmented, which only the larger RPC limit bounds.
    await muxer.send(textMessage(content));
    expect(socket.frames.length).toBeGreaterThan(1);
  });

  test('sendSync writes every frame before it returns', ({ expect }) => {
    const socket = new TestSocket();
    const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
    const segmented = textMessage(SEGMENTED_CONTENT);
    muxer.sendSync(segmented);
    muxer.sendSync(unsegmentedMessage('small'));

    expect(socket.frames).toHaveLength(segmentCount(segmented) + 1);
    const receiver = new WebSocketMuxer(new TestSocket());
    const received = socket.frames.map((frame) => receiver.receiveData(frame)).filter(isNonNullable);
    expect(received.map(textOf)).toEqual([SEGMENTED_CONTENT, 'small']);
  });

  test('rejects the rest of a segmented message when the socket closes mid-sequence', async ({ expect }) => {
    const socket = new TestSocket();
    socket.onFrame = () => {
      socket.readyState = WS_CLOSED;
    };
    const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });

    await expect(muxer.send(textMessage(SEGMENTED_CONTENT))).rejects.toBeInstanceOf(WebSocketClosedError);
    expect(socket.frames).toHaveLength(1);

    // A later send on the closed socket settles too, and nothing of the dropped message follows it.
    await expect(muxer.send(textMessage(SEGMENTED_CONTENT))).rejects.toBeInstanceOf(WebSocketClosedError);
    expect(socket.frames).toHaveLength(1);
  });

  test('rejects queued segmented sends when the socket send throws', async ({ expect }) => {
    const socket = new TestSocket();
    socket.sendError = new Error("Can't call WebSocket send() after close()");
    const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
    const sends = [
      muxer.send(textMessage(SEGMENTED_CONTENT, 'service-a')),
      muxer.send(textMessage(SEGMENTED_CONTENT, 'service-b')),
    ];

    await Promise.all(sends.map((sent) => expect(sent).rejects.toBe(socket.sendError)));
  });

  test('rejects a segmented send whose final segment the socket refuses', async ({ expect }) => {
    const socket = new TestSocket();
    const failure = new Error("Can't call WebSocket send() after close()");
    const message = textMessage(SEGMENTED_CONTENT);
    const segmentCount = Math.ceil(buf.toBinary(MessageSchema, message).byteLength / MAX_CHUNK_LENGTH);
    socket.onFrame = () => {
      if (socket.frames.length === segmentCount - 1) {
        socket.sendError = failure;
      }
    };
    const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });

    await expect(muxer.send(message)).rejects.toBe(failure);
    expect(socket.frames).toHaveLength(segmentCount - 1);
  });

  test('sends segmented messages again once the socket stops throwing', async ({ expect }) => {
    const socket = new TestSocket();
    socket.sendError = new Error("Can't call WebSocket send() after close()");
    const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
    await expect(muxer.send(textMessage('dropped'.repeat(8)))).rejects.toBe(socket.sendError);

    socket.sendError = undefined;
    await muxer.send(textMessage('delivered'.repeat(8)));

    // Decodes to the second message alone, so none of the failed message's segments stayed queued.
    const receiver = new WebSocketMuxer(new TestSocket());
    const received = socket.frames.map((frame) => receiver.receiveData(frame)).filter(isNonNullable);
    expect(received.map(textOf)).toEqual(['delivered'.repeat(8)]);
  });

  test('rejects later segmented sends once a message was cut off mid-sequence', async ({ expect }) => {
    const socket = new TestSocket();
    const failure = new Error("Can't call WebSocket send() after close()");
    socket.onFrame = () => {
      socket.sendError = failure;
    };
    const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
    await expect(muxer.send(textMessage('dropped'.repeat(8)))).rejects.toBe(failure);
    expect(socket.frames).toHaveLength(1);

    socket.onFrame = undefined;
    socket.sendError = undefined;
    // The receiver still holds the first segment, which a later sequence would be appended to.
    await expect(muxer.send(textMessage('next'.repeat(8)))).rejects.toBe(failure);
    await expect(muxer.send(textMessage('other'.repeat(8), 'other-service'))).rejects.toBe(failure);
    expect(socket.frames).toHaveLength(1);

    // Unsegmented frames never touch the receiver's sequences, so they still go through.
    await muxer.send(protocol.createMessage(TextMessageSchema, { payload: { message: 'unsegmented' } }));
    expect(socket.frames).toHaveLength(2);
  });

  describe('send timing', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    for (const [socketKind, bufferedAmount] of [
      ['a socket without bufferedAmount, as in workerd', undefined],
      ['a socket with an empty buffer', 0],
    ] as const) {
      test(`writes every segment before send returns on ${socketKind}`, async ({ expect }) => {
        const socket = new TestSocket();
        socket.bufferedAmount = bufferedAmount;
        const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
        const message = textMessage(SEGMENTED_CONTENT);
        const sent = muxer.send(message);

        expect(socket.frames).toHaveLength(segmentCount(message));
        expect(vi.getTimerCount()).toBe(0);
        await sent;
      });
    }

    test('waits while the socket buffer is full and resumes once it drains', async ({ expect }) => {
      const socket = new TestSocket();
      socket.bufferedAmount = 0;
      socket.onFrame = () => {
        socket.bufferedAmount = SOCKET_BUFFER_FULL;
      };
      const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
      const message = textMessage(SEGMENTED_CONTENT);
      const sent = muxer.send(message);
      expect(socket.frames).toHaveLength(1);

      vi.advanceTimersToNextTimer();
      expect(socket.frames).toHaveLength(1);

      socket.onFrame = undefined;
      socket.bufferedAmount = 0;
      vi.advanceTimersToNextTimer();
      expect(socket.frames).toHaveLength(segmentCount(message));
      await sent;
      expect(vi.getTimerCount()).toBe(0);
    });

    test('sendSync ignores a full socket buffer and arms no timer', ({ expect }) => {
      const socket = new TestSocket();
      socket.bufferedAmount = SOCKET_BUFFER_FULL;
      const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
      const message = textMessage(SEGMENTED_CONTENT);
      muxer.sendSync(message);

      expect(socket.frames).toHaveLength(segmentCount(message));
      expect(vi.getTimerCount()).toBe(0);
    });

    test('waits while the socket is connecting', async ({ expect }) => {
      const socket = new TestSocket();
      socket.readyState = WS_CONNECTING;
      const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
      const message = textMessage(SEGMENTED_CONTENT);
      const sent = muxer.send(message);
      expect(socket.frames).toHaveLength(0);

      socket.readyState = WS_OPEN;
      vi.advanceTimersToNextTimer();
      expect(socket.frames).toHaveLength(segmentCount(message));
      await sent;
    });

    for (const [state, readyState] of [
      ['closing', WS_CLOSING],
      ['closed', WS_CLOSED],
    ] as const) {
      test(`rejects sends queued behind a full buffer once the socket is ${state}`, async ({ expect }) => {
        const socket = new TestSocket();
        socket.bufferedAmount = SOCKET_BUFFER_FULL;
        const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
        const sends = [
          muxer.send(textMessage(SEGMENTED_CONTENT, 'service-a')),
          muxer.send(textMessage(SEGMENTED_CONTENT, 'service-b')),
        ];
        socket.readyState = readyState;
        vi.advanceTimersToNextTimer();

        await Promise.all(sends.map((sent) => expect(sent).rejects.toBeInstanceOf(WebSocketClosedError)));
        expect(socket.frames).toHaveLength(0);
        expect(vi.getTimerCount()).toBe(0);
      });
    }

    test('rejects sends queued behind a full buffer when the muxer is destroyed', async ({ expect }) => {
      const socket = new TestSocket();
      socket.bufferedAmount = SOCKET_BUFFER_FULL;
      const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
      const sent = muxer.send(textMessage(SEGMENTED_CONTENT));

      // The order `EdgeWsConnection` tears down in: close the socket, then destroy the muxer.
      socket.readyState = WS_CLOSING;
      muxer.destroy();

      await expect(sent).rejects.toBeInstanceOf(WebSocketClosedError);
      expect(socket.frames).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    test('keeps 300 queued segmented messages apart on one-byte channel ids', async ({ expect }) => {
      const socket = new TestSocket();
      // Queued behind a full buffer, the messages go out one segment per channel per round.
      socket.bufferedAmount = SOCKET_BUFFER_FULL;
      const muxer = new WebSocketMuxer(socket, { maxChunkLength: MAX_CHUNK_LENGTH });
      const services = Array.from({ length: 300 }, (_, index) => `service-${index}`);
      const sends = services.map((serviceId) =>
        muxer.send(textMessage(`${serviceId}:${SEGMENTED_CONTENT}`, serviceId)),
      );
      socket.bufferedAmount = 0;
      vi.runAllTimers();
      await Promise.all(sends);

      expect(socket.frames[1][1]).not.toBe(socket.frames[0][1]);
      const receiver = new WebSocketMuxer(new TestSocket());
      const received = socket.frames.map((frame) => receiver.receiveData(frame)).filter(isNonNullable);
      expect(received.map((message) => message.serviceId).sort()).toEqual([...services].sort());
      expect(received.every((message) => textOf(message) === `${message.serviceId}:${SEGMENTED_CONTENT}`)).toBe(true);
    });
  });
});

/** The socket side of the muxer; `send` throws `sendError` while it is set and runs `onFrame` after each frame. */
class TestSocket {
  readonly frames: Uint8Array[] = [];
  readyState = WS_OPEN;
  /** Left unset, as workerd's is. */
  bufferedAmount?: number;
  sendError?: Error;
  onFrame?: () => void;

  send(frame: Uint8Array): void {
    if (this.sendError) {
      throw this.sendError;
    }
    this.frames.push(frame);
    this.onFrame?.();
  }
}

/** A non-terminating chunk of a segmented sequence on {@link CHANNEL_ID}. */
const segmentChunk = (payload: Uint8Array) => {
  const data = new Uint8Array(2 + payload.byteLength);
  data[0] = FLAG_SEGMENT_SEQ;
  data[1] = CHANNEL_ID;
  data.set(payload, 2);
  return data;
};

const textMessage = (message: string, serviceId = 'test-service') =>
  protocol.createMessage(TextMessageSchema, { serviceId, payload: { message } });

/** Without a service id the muxer never segments a message. */
const unsegmentedMessage = (message: string) => protocol.createMessage(TextMessageSchema, { payload: { message } });

const segmentCount = (message: Message) =>
  Math.ceil(buf.toBinary(MessageSchema, message).byteLength / MAX_CHUNK_LENGTH);

const textOf = (message: Message) => protocol.getPayload(message, TextMessageSchema).message;

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
