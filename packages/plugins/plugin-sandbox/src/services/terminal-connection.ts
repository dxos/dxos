//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

import { type TerminalEndpoint } from './SandboxClient.ts';

type Disposable = { dispose: () => void };

/** The part of an xterm the connection drives; structural, so this module needs no xterm import. */
export type TerminalSink = {
  readonly cols: number;
  readonly rows: number;
  write: (data: string | Uint8Array) => void;
  reset: () => void;
  onData: (listener: (data: string) => void) => Disposable;
  onResize: (listener: (size: { cols: number; rows: number }) => void) => Disposable;
};

export type TerminalStatus = 'connecting' | 'connected' | 'reconnecting' | 'exited';

/** A socket that closed before its shell exited: the network, or the container going away. */
export class TerminalDisconnectedError extends BaseError.extend(
  'TerminalDisconnectedError',
  'Terminal disconnected.',
) {}

/** Control frames from sandbox-service's PTY; output arrives as binary frames instead. */
const ControlMessage = Schema.Union([
  Schema.Struct({ type: Schema.Literal('ready') }),
  Schema.Struct({ type: Schema.Literal('exit'), code: Schema.optional(Schema.Number) }),
  Schema.Struct({ type: Schema.Literal('error'), message: Schema.optional(Schema.String) }),
]);

const decodeControl = Schema.decodeUnknownOption(Schema.fromJsonString(ControlMessage));

/** Backoff between reconnects: quick at first, then capped so a long outage is not hammered. */
const RECONNECT = Schedule.min([Schedule.exponential(Duration.millis(500)), Schedule.spaced(Duration.seconds(15))]);

const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/**
 * One socket to the shell, until it closes: succeeds with the exit code once the shell exits, fails
 * with {@link TerminalDisconnectedError} if the socket drops first. Interrupting closes the socket and
 * leaves the shell running, which is what lets the next connection resume it.
 */
const attach = (
  sink: TerminalSink,
  endpoint: TerminalEndpoint,
  onStatus: (status: TerminalStatus) => void,
): Effect.Effect<number | undefined, TerminalDisconnectedError> =>
  Effect.callback<number | undefined, TerminalDisconnectedError>((resume) => {
    const socket = new WebSocket(endpoint.url, [...endpoint.protocols]);
    socket.binaryType = 'arraybuffer';
    const encoder = new TextEncoder();
    const listeners: Disposable[] = [];
    let exitCode: { code: number | undefined } | undefined;

    const send = (data: string | Uint8Array<ArrayBuffer>) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    };
    const sendSize = () => send(JSON.stringify({ type: 'resize', cols: sink.cols, rows: sink.rows }));

    socket.addEventListener('open', () => {
      listeners.push(sink.onData((data) => send(encoder.encode(data))));
      listeners.push(sink.onResize(sendSize));
    });
    socket.addEventListener('message', ({ data }) => {
      if (data instanceof ArrayBuffer) {
        sink.write(new Uint8Array(data));
        return;
      }
      const message = decodeControl(data);
      if (message._tag === 'None') {
        return;
      }
      switch (message.value.type) {
        case 'ready':
          // The grid may have changed between minting the endpoint and the shell coming up.
          sendSize();
          onStatus('connected');
          break;
        case 'exit':
          exitCode = { code: message.value.code };
          break;
        case 'error':
          sink.write(`\r\n${DIM}${message.value.message ?? 'terminal error'}${RESET}\r\n`);
          break;
      }
    });
    socket.addEventListener('close', ({ code, reason }) => {
      resume(
        exitCode
          ? Effect.succeed(exitCode.code)
          : Effect.fail(new TerminalDisconnectedError({ context: { code, reason } })),
      );
    });

    return Effect.sync(() => {
      listeners.forEach((listener) => listener.dispose());
      socket.close();
    });
  });

/** Resolves on the next keystroke, so an exited shell restarts only when the reader asks. */
const nextKey = (sink: TerminalSink): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const listener = sink.onData(() => resume(Effect.void));
    return Effect.sync(() => listener.dispose());
  });

/**
 * Drives `sink` from the sandbox's shell for as long as the effect runs, reconnecting when the
 * socket drops and restarting the shell on a keystroke once it exits. `open` mints the endpoint for
 * each connection, since its credential serves one upgrade.
 *
 * The screen is reset before every connection: the service replays the shell's scrollback on
 * attach, which would otherwise be drawn a second time below what is already there.
 */
export const runTerminal = <E>(
  sink: TerminalSink,
  open: (size: { cols: number; rows: number }) => Effect.Effect<TerminalEndpoint, E>,
  onStatus: (status: TerminalStatus) => void,
): Effect.Effect<never> => {
  const connection = Effect.gen(function* () {
    const endpoint = yield* open({ cols: sink.cols, rows: sink.rows });
    sink.reset();
    return yield* attach(sink, endpoint, onStatus);
  }).pipe(
    Effect.tapError(() => Effect.sync(() => onStatus('reconnecting'))),
    Effect.retry(RECONNECT),
    // The schedule never ends, so no failure gets past the retry; this only tells the checker so.
    Effect.orDie,
  );

  return Effect.gen(function* () {
    onStatus('connecting');
    const code = yield* connection;
    onStatus('exited');
    sink.write(
      `\r\n${DIM}Shell exited${code === undefined ? '' : ` with code ${code}`}. Press any key to restart.${RESET}\r\n`,
    );
    yield* nextKey(sink);
  }).pipe(Effect.forever);
};
