//
// Copyright 2025 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { bufWkt } from '@dxos/protocols/buf';
import { type Message, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { type EdgeIdentity } from './edge-identity';
import { WebSocketMuxer } from './edge-ws-muxer';

// Segmented-message chunk count depends on the protobuf envelope overhead, which is
// determined empirically (see chunk-count assertions below) rather than assumed.
const MAX_CHUNK_LENGTH = 64;
const MESSAGE_A_CONTENT = 'a'.repeat(20);
const MESSAGE_B_CONTENT = 'b'.repeat(120);

// Replace isomorphic-ws's default export with a controllable fake so tests can drive
// the connection's onmessage handler directly and inspect what it sends.
const { FakeWebSocket } = vi.hoisted(() => {
  class FakeWebSocket {
    static instances: FakeWebSocket[] = [];

    readyState = 1;
    protocol = '';
    binaryType = 'nodebuffer';
    onopen: (() => void) | null = null;
    onclose: ((event: { code?: number; reason?: string }) => void) | null = null;
    onerror: ((event: { error?: unknown; message?: string }) => void) | null = null;
    onmessage: ((event: { data: unknown; type: string }) => void) | null = null;
    readonly sent: unknown[] = [];

    constructor(
      public readonly url: string,
      public readonly protocols?: string[],
      public readonly options?: unknown,
    ) {
      FakeWebSocket.instances.push(this);
    }

    send(data: unknown): void {
      this.sent.push(data);
    }

    close(): void {}
  }

  return { FakeWebSocket };
});

vi.mock('isomorphic-ws', () => ({ default: FakeWebSocket }));

const { EdgeWsConnection } = await import('./edge-ws-connection');

const testIdentity: EdgeIdentity = {
  peerKey: 'test-peer-key',
  identityDid: 'did:halo:test',
  presentCredentials: async () => {
    throw new Error('not implemented');
  },
};

describe('EdgeWsConnection', () => {
  test('reassembles segmented messages delivered as Blobs out of order', async ({ expect }) => {
    const [chunksA, chunksB] = await buildSegmentedChunks([MESSAGE_A_CONTENT, MESSAGE_B_CONTENT]);
    expect(chunksA).toHaveLength(2);
    expect(chunksB).toHaveLength(4);

    const { ws, received, allReceived } = await openTestConnection(2);

    const deferredA = chunksA.map(deferredChunk);
    const deferredB = chunksB.map(deferredChunk);

    // Dispatch every chunk in correct wire order, as a real WebSocket would.
    for (const { blob } of [...deferredA, ...deferredB]) {
      ws.onmessage?.({ data: blob, type: 'message' });
    }

    // Resolve the underlying `arrayBuffer()` reads out of order, simulating the browser
    // race where concurrent Blob reads do not complete in arrival order.
    deferredA[0].resolve();
    deferredB[0].resolve();
    deferredB[1].resolve();
    deferredA[1].resolve();
    deferredB[2].resolve();
    deferredB[3].resolve();

    await allReceived.wait();
    expect(received).toHaveLength(2);

    const [messageA, messageB] = received;
    invariant(messageA.payload);
    invariant(messageB.payload);
    expect(bufWkt.anyUnpack(messageA.payload, TextMessageSchema)?.message).toStrictEqual(MESSAGE_A_CONTENT);
    expect(bufWkt.anyUnpack(messageB.payload, TextMessageSchema)?.message).toStrictEqual(MESSAGE_B_CONTENT);
  });

  test('reassembles segmented messages delivered as ArrayBuffers', async ({ expect }) => {
    const [chunksA, chunksB] = await buildSegmentedChunks([MESSAGE_A_CONTENT, MESSAGE_B_CONTENT]);

    const { ws, received, allReceived } = await openTestConnection(2);

    for (const chunk of [...chunksA, ...chunksB]) {
      ws.onmessage?.({ data: toArrayBuffer(chunk), type: 'message' });
    }

    await allReceived.wait();
    expect(received).toHaveLength(2);

    const [messageA, messageB] = received;
    invariant(messageA.payload);
    invariant(messageB.payload);
    expect(bufWkt.anyUnpack(messageA.payload, TextMessageSchema)?.message).toStrictEqual(MESSAGE_A_CONTENT);
    expect(bufWkt.anyUnpack(messageB.payload, TextMessageSchema)?.message).toStrictEqual(MESSAGE_B_CONTENT);
  });
});

/**
 * A Blob whose `arrayBuffer()` resolves only when `resolve()` is called, so tests can
 * control the order in which concurrent `blob.arrayBuffer()` reads complete.
 */
class DeferredBlob extends Blob {
  readonly #result: Promise<ArrayBuffer>;

  constructor(result: Promise<ArrayBuffer>) {
    super();
    this.#result = result;
  }

  override async arrayBuffer(): Promise<ArrayBuffer> {
    // `await` (not a bare `return`) so the listener attaches to `#result` synchronously,
    // during dispatch, rather than one microtask later — otherwise resolving out of
    // dispatch order has no effect once every deferred promise is already settled.
    return await this.#result;
  }
}

type DeferredChunk = {
  blob: DeferredBlob;
  resolve: () => void;
};

const deferredChunk = (bytes: Uint8Array): DeferredChunk => {
  let resolveResult: (buffer: ArrayBuffer) => void = () => {};
  const result = new Promise<ArrayBuffer>((res) => {
    resolveResult = res;
  });
  // Copy so the returned ArrayBuffer starts at offset 0 and is independent of the source view.
  const copy = new Uint8Array(bytes);
  return { blob: new DeferredBlob(result), resolve: () => resolveResult(copy.buffer) };
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => new Uint8Array(bytes).buffer;

const textMessage = (message: string) =>
  protocol.createMessage(TextMessageSchema, {
    serviceId: 'test-service',
    payload: { message },
  });

/**
 * Sends each content string as a message on the same muxer/channel and returns the wire
 * chunks grouped by message, mirroring how `WebSocketMuxer` splits segmented messages.
 */
const buildSegmentedChunks = async (contents: string[]): Promise<Uint8Array[][]> => {
  const sentMessages: Uint8Array[] = [];
  const muxer = new WebSocketMuxer(
    { readyState: 1, send: (message: string) => sentMessages.push(Buffer.from(message)) },
    { maxChunkLength: MAX_CHUNK_LENGTH },
  );

  const chunkCounts: number[] = [];
  for (const content of contents) {
    const before = sentMessages.length;
    await muxer.send(textMessage(content));
    chunkCounts.push(sentMessages.length - before);
  }

  const chunksByMessage: Uint8Array[][] = [];
  let offset = 0;
  for (const count of chunkCounts) {
    chunksByMessage.push(sentMessages.slice(offset, offset + count));
    offset += count;
  }
  return chunksByMessage;
};

const openTestConnection = async (expectedMessages: number) => {
  const received: Message[] = [];
  const allReceived = new Trigger();
  const connection = new EdgeWsConnection(
    testIdentity,
    { url: new URL('ws://localhost:1234') },
    {
      onConnected: () => {},
      onMessage: (message) => {
        received.push(message);
        if (received.length === expectedMessages) {
          allReceived.wake();
        }
      },
      onRestartRequired: () => {},
    },
  );
  await connection.open();
  onTestFinished(async () => {
    await connection.close();
  });

  const ws = FakeWebSocket.instances.at(-1);
  invariant(ws, 'FakeWebSocket instance not created');
  ws.onopen?.();

  return { connection, ws, received, allReceived };
};
