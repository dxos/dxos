//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeWebSocketTransport } from './Transport';

describe('makeWebSocketTransport', () => {
  test('delivers a frame with no trailing terminator as a single line', ({ expect }) => {
    const { transport, socket } = makeHarness();
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    socket.emit('message', { data: 'CAP * LS :sasl' });

    expect(lines).toEqual(['CAP * LS :sasl']);
  });

  test('splits a frame containing multiple CRLF-separated lines', ({ expect }) => {
    const { transport, socket } = makeHarness();
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    socket.emit('message', { data: 'PING :s1\r\nPING :s2\r\n' });

    expect(lines).toEqual(['PING :s1', 'PING :s2']);
  });

  test('splits a frame containing multiple bare-LF-separated lines', ({ expect }) => {
    const { transport, socket } = makeHarness();
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    socket.emit('message', { data: 'PING :s1\nPING :s2' });

    expect(lines).toEqual(['PING :s1', 'PING :s2']);
  });

  test('skips empty lines', ({ expect }) => {
    const { transport, socket } = makeHarness();
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    socket.emit('message', { data: '\r\n' });

    expect(lines).toEqual([]);
  });

  test('does not require a trailing terminator across separate frames', ({ expect }) => {
    const { transport, socket } = makeHarness();
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    // freeq sends whole lines per frame with no terminator; a second frame
    // must not be concatenated onto the first (no cross-frame buffering).
    socket.emit('message', { data: 'PING :s1' });
    socket.emit('message', { data: 'PING :s2' });

    expect(lines).toEqual(['PING :s1', 'PING :s2']);
  });

  test('send() sends the line with no trailing terminator', ({ expect }) => {
    const { transport, socket } = makeHarness();

    transport.send('NICK alice');

    expect(socket.sent).toEqual(['NICK alice']);
  });

  test('onError forwards the socket error event', ({ expect }) => {
    const { transport, socket } = makeHarness();
    const errors: unknown[] = [];
    transport.onError?.((event) => errors.push(event));

    const errorEvent = { type: 'error' };
    socket.emit('error', errorEvent);

    expect(errors).toEqual([errorEvent]);
  });
});

type Listener = (event: any) => void;

// Minimal fake WebSocket: freeq frames one IRC line per message, with no
// trailing terminator, so the fake only needs to dispatch `message`/`open`/`close`/`error`.
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  sent: string[] = [];
  #listeners = new Map<string, Set<Listener>>();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, cb: Listener): void {
    const set = this.#listeners.get(type) ?? new Set();
    set.add(cb);
    this.#listeners.set(type, set);
  }

  emit(type: string, event: any = {}): void {
    this.#listeners.get(type)?.forEach((cb) => cb(event));
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.emit('close');
  }
}

const makeHarness = () => {
  FakeWebSocket.instances.length = 0;
  const transport = makeWebSocketTransport('wss://irc.freeq.at/irc', FakeWebSocket as any);
  const socket = FakeWebSocket.instances[0];
  return { transport, socket };
};
