//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as TestClock from 'effect/testing/TestClock';

import { type TerminalSink, type TerminalStatus, runTerminal } from './terminal-connection.ts';

/** Stands in for the browser WebSocket: records what is sent, and lets the test play the server. */
class FakeSocket extends EventTarget {
  static readonly OPEN = 1;
  static instances: FakeSocket[] = [];

  readyState = 0;
  binaryType = 'blob';
  readonly sent: Array<string | Uint8Array> = [];

  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    super();
    FakeSocket.instances.push(this);
  }

  send(data: string | Uint8Array) {
    this.sent.push(data);
  }

  close() {
    this.serverClose();
  }

  serverOpen() {
    this.readyState = FakeSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  serverSend(data: string | ArrayBuffer) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }

  serverClose() {
    if (this.readyState === 3) {
      return;
    }
    this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event('close'), { code: 1006, reason: '' }));
  }
}

const makeSink = () => {
  const dataListeners = new Set<(data: string) => void>();
  const sink = {
    cols: 80,
    rows: 24,
    written: [] as Array<string | Uint8Array>,
    resets: 0,
    write: (data: string | Uint8Array) => void sink.written.push(data),
    reset: () => void sink.resets++,
    onData: (listener: (data: string) => void) => {
      dataListeners.add(listener);
      return { dispose: () => dataListeners.delete(listener) };
    },
    onResize: () => ({ dispose: () => {} }),
    type: (data: string) => dataListeners.forEach((listener) => listener(data)),
  } satisfies TerminalSink & Record<string, unknown>;
  return sink;
};

const endpoint = { url: 'wss://edge.test/sandbox/terminal', protocols: ['dxos.sandbox.terminal.v1'] };

/** Lets the forked fiber run up to its next suspension. */
const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 10 }));

describe('runTerminal', () => {
  const originalWebSocket = globalThis.WebSocket;
  beforeEach(() => {
    FakeSocket.instances = [];
    Object.assign(globalThis, { WebSocket: FakeSocket });
  });
  afterEach(() => {
    Object.assign(globalThis, { WebSocket: originalWebSocket });
  });

  it.effect('pipes output to the terminal and keystrokes to the shell', () =>
    Effect.gen(function* () {
      const sink = makeSink();
      const statuses: TerminalStatus[] = [];
      const fiber = yield* Effect.forkChild(
        runTerminal(
          sink,
          () => Effect.succeed(endpoint),
          (status) => statuses.push(status),
        ),
      );
      yield* settle;

      const [socket] = FakeSocket.instances;
      expect(socket.protocols).toEqual(endpoint.protocols);
      socket.serverOpen();
      socket.serverSend(JSON.stringify({ type: 'ready' }));
      socket.serverSend(new TextEncoder().encode('$ ').buffer);
      sink.type('ls\r');

      expect(statuses).toEqual(['connecting', 'connected']);
      expect(sink.written).toEqual([new TextEncoder().encode('$ ')]);
      expect(socket.sent).toEqual([
        JSON.stringify({ type: 'resize', cols: 80, rows: 24 }),
        new TextEncoder().encode('ls\r'),
      ]);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect('reconnects with a fresh endpoint and screen when the socket drops', () =>
    Effect.gen(function* () {
      const sink = makeSink();
      let opened = 0;
      const statuses: TerminalStatus[] = [];
      const fiber = yield* Effect.forkChild(
        runTerminal(
          sink,
          () =>
            Effect.sync(() => {
              opened++;
              return endpoint;
            }),
          (status) => statuses.push(status),
        ),
      );
      yield* settle;
      FakeSocket.instances[0].serverOpen();
      FakeSocket.instances[0].serverClose();
      yield* settle;
      yield* TestClock.adjust('1 second');
      yield* settle;

      expect(opened).toBe(2);
      expect(sink.resets).toBe(2);
      expect(FakeSocket.instances).toHaveLength(2);
      expect(statuses).toContain('reconnecting');
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect('restarts an exited shell only on a keystroke', () =>
    Effect.gen(function* () {
      const sink = makeSink();
      const statuses: TerminalStatus[] = [];
      const fiber = yield* Effect.forkChild(
        runTerminal(
          sink,
          () => Effect.succeed(endpoint),
          (status) => statuses.push(status),
        ),
      );
      yield* settle;
      const [socket] = FakeSocket.instances;
      socket.serverOpen();
      socket.serverSend(JSON.stringify({ type: 'exit', code: 0 }));
      socket.serverClose();
      yield* settle;

      expect(statuses.at(-1)).toBe('exited');
      expect(String(sink.written.at(-1))).toContain('Shell exited with code 0');
      expect(FakeSocket.instances).toHaveLength(1);

      sink.type('x');
      yield* settle;
      expect(FakeSocket.instances).toHaveLength(2);
      yield* Fiber.interrupt(fiber);
    }),
  );

  it.effect('closes the socket when interrupted', () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(
        runTerminal(
          makeSink(),
          () => Effect.succeed(endpoint),
          () => {},
        ),
      );
      yield* settle;
      yield* Fiber.interrupt(fiber);
      expect(FakeSocket.instances[0].readyState).toBe(3);
    }),
  );
});
