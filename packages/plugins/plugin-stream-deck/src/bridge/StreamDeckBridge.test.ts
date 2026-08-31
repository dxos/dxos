//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';

import * as Protocol from '#protocol';

import { type BridgeState, StreamDeckBridge } from './StreamDeckBridge';

const PORT = 21998;
const URL = `ws://127.0.0.1:${PORT}`;

const frame = (title: string): Protocol.Frame => ({
  _tag: 'frame',
  keys: [{ svg: '<svg/>', target: 'eid:1' }],
  dials: [{ title, value: '1' }],
});

describe('StreamDeckBridge', () => {
  let server: WebSocketServer;
  let sockets: WebSocket[];
  let received: unknown[];
  let greeting: (socket: WebSocket) => void;

  beforeEach(async () => {
    sockets = [];
    received = [];
    greeting = (socket) =>
      socket.send(
        JSON.stringify({ _tag: 'hello', protocol: Protocol.PROTOCOL_VERSION, device: Protocol.streamDeckPlus }),
      );
    server = new WebSocketServer({ host: '127.0.0.1', port: PORT });
    server.on('connection', (socket) => {
      sockets.push(socket);
      socket.on('message', (data) => received.push(JSON.parse(String(data))));
      greeting(socket);
    });
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const open = () => {
    const states: BridgeState[] = [];
    const inputs: Protocol.Input[] = [];
    const bridge = new StreamDeckBridge({
      url: URL,
      connect: (url) => new WebSocket(url) as never,
      onStateChange: (state) => states.push(state),
      onInput: (input) => inputs.push(input),
    });
    bridge.open();
    return { bridge, states, inputs };
  };

  test('connects and reports the device from the greeting', async ({ expect }) => {
    const { bridge } = open();
    await expect.poll(() => bridge.state).toBe('connected');
    expect(bridge.device).toEqual(Protocol.streamDeckPlus);
    bridge.close();
  });

  test('publishes a frame once connected', async ({ expect }) => {
    const { bridge } = open();
    await expect.poll(() => bridge.state).toBe('connected');

    bridge.publish(frame('Objects'));
    await expect.poll(() => received).toHaveLength(1);
    expect(received[0]).toEqual(frame('Objects'));
    bridge.close();
  });

  test('skips an unchanged frame and sends a changed one', async ({ expect }) => {
    const { bridge } = open();
    await expect.poll(() => bridge.state).toBe('connected');

    bridge.publish(frame('Objects'));
    bridge.publish(frame('Objects'));
    await expect.poll(() => received).toHaveLength(1);

    bridge.publish(frame('Feeds'));
    await expect.poll(() => received).toHaveLength(2);
    bridge.close();
  });

  test('drops frames while disconnected', async ({ expect }) => {
    const bridge = new StreamDeckBridge({ url: URL, connect: (url) => new WebSocket(url) as never });
    bridge.publish(frame('Objects'));
    expect(received).toHaveLength(0);
    bridge.close();
  });

  test('forwards input from the device', async ({ expect }) => {
    const { bridge, inputs } = open();
    await expect.poll(() => bridge.state).toBe('connected');

    sockets[0].send(JSON.stringify({ _tag: 'input', kind: 'keyDown', slot: 2 }));
    await expect.poll(() => inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ kind: 'keyDown', slot: 2 });
    bridge.close();
  });

  test('refuses an incompatible protocol without retrying', async ({ expect }) => {
    greeting = (socket) =>
      socket.send(JSON.stringify({ _tag: 'hello', protocol: 999, device: Protocol.streamDeckPlus }));

    const { bridge } = open();
    await expect.poll(() => bridge.state).toBe('incompatible');
    // The connection count stays put — a mismatch is not something a reconnect can fix.
    const attempts = sockets.length;
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(sockets).toHaveLength(attempts);
    bridge.close();
  });

  test('ignores an unparseable message', async ({ expect }) => {
    const { bridge, inputs } = open();
    await expect.poll(() => bridge.state).toBe('connected');

    sockets[0].send('not json');
    sockets[0].send(JSON.stringify({ _tag: 'nonsense' }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(inputs).toHaveLength(0);
    expect(bridge.state).toBe('connected');
    bridge.close();
  });

  test('reconnects after the device plugin goes away', async ({ expect }) => {
    const { bridge } = open();
    await expect.poll(() => bridge.state).toBe('connected');

    sockets[0].close();
    await expect.poll(() => bridge.state).toBe('idle');
    // The first backoff is a second, so the reconnect is observed rather than awaited here.
    await expect.poll(() => bridge.state, { timeout: 5_000 }).toBe('connected');
    bridge.close();
  });
});
