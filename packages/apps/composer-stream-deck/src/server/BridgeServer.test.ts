//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';
import { WebSocket } from 'ws';

import * as Protocol from '@dxos/plugin-stream-deck/Protocol';

import { BridgeServer } from './BridgeServer';

// A high fixed port would collide with a developer's running plugin; 0 is not usable because the
// client has to know where to dial, so the suite picks its own port per file.
const PORT = 21999;

/**
 * Buffers messages from the moment the socket exists. The server greets a client the instant it
 * connects, so a listener attached after `open` races that greeting — as the real client does not,
 * since it registers its handler when it constructs the socket.
 */
class TestClient {
  readonly #messages: unknown[] = [];
  readonly #waiters: ((message: unknown) => void)[] = [];

  private constructor(readonly socket: WebSocket) {}

  static async connect(port: number): Promise<TestClient> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const client = new TestClient(socket);
    socket.on('message', (data) => client.#push(JSON.parse(String(data))));
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    return client;
  }

  next<T>(): Promise<T> {
    const buffered = this.#messages.shift();
    if (buffered !== undefined) {
      return Promise.resolve(buffered as T);
    }
    return new Promise<T>((resolve) => this.#waiters.push(resolve as (message: unknown) => void));
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  closed(): Promise<void> {
    return new Promise((resolve) => this.socket.once('close', () => resolve()));
  }

  close(): void {
    this.socket.close();
  }

  #push(message: unknown): void {
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter(message);
    } else {
      this.#messages.push(message);
    }
  }
}

describe('BridgeServer', () => {
  let server: BridgeServer;
  let frames: Protocol.Frame[];
  let disconnects: number;

  beforeEach(async () => {
    frames = [];
    disconnects = 0;
    server = new BridgeServer({
      port: PORT,
      device: Protocol.streamDeckPlus,
      onFrame: async (frame) => {
        frames.push(frame);
      },
      onDisconnect: async () => {
        disconnects++;
      },
    });
    await server.listen();
  });

  afterEach(async () => {
    await server.close();
  });

  test('greets a client with the device profile', async ({ expect }) => {
    const client = await TestClient.connect(PORT);
    expect(await client.next<Protocol.Hello>()).toEqual({
      _tag: 'hello',
      protocol: Protocol.PROTOCOL_VERSION,
      device: Protocol.streamDeckPlus,
    });
    client.close();
  });

  test('applies a frame sent by the client', async ({ expect }) => {
    const client = await TestClient.connect(PORT);
    await client.next();

    const frame: Protocol.Frame = {
      _tag: 'frame',
      keys: [{ svg: '<svg/>', target: 'eid:1' }, null],
      dials: [{ title: 'Objects', value: '12' }],
    };
    client.send(frame);

    await expect.poll(() => frames).toHaveLength(1);
    expect(frames[0]).toEqual(frame);
    client.close();
  });

  test('discards malformed and unrecognized messages without dropping the connection', async ({ expect }) => {
    const client = await TestClient.connect(PORT);
    await client.next();

    client.socket.send('not json');
    client.send({ _tag: 'frame', keys: 'wrong' });
    client.send({ _tag: 'frame', keys: [], dials: [] });

    await expect.poll(() => frames).toHaveLength(1);
    expect(server.connected).toBe(true);
    client.close();
  });

  test('reports input to the connected client', async ({ expect }) => {
    const client = await TestClient.connect(PORT);
    await client.next();

    server.send({ _tag: 'input', kind: 'keyDown', slot: 3 });
    expect(await client.next<Protocol.Input>()).toEqual({ _tag: 'input', kind: 'keyDown', slot: 3 });
    client.close();
  });

  test('a second client supersedes the first', async ({ expect }) => {
    const first = await TestClient.connect(PORT);
    await first.next();
    const closed = first.closed();

    const second = await TestClient.connect(PORT);
    await second.next();
    await closed;

    expect(server.connected).toBe(true);
    second.close();
  });

  test('reports the disconnect so the device can go offline', async ({ expect }) => {
    const client = await TestClient.connect(PORT);
    await client.next();
    client.close();

    await expect.poll(() => disconnects).toBe(1);
    expect(server.connected).toBe(false);
  });
});
