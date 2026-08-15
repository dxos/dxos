//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { BaseError } from '@dxos/errors';

import { WATCH_CHILD_ENV, WATCH_READY_SENTINEL } from './watch-protocol';

export class WatchError extends BaseError.extend('WatchError', 'MCP watch supervisor error') {}

/**
 * Id for the handshake replayed into a reloaded child. Namespaced so a client's own id cannot
 * collide with it, and the response is dropped rather than forwarded — the client already holds an
 * `initialize` result from before the reload.
 */
const REPLAY_ID = '@dxos/cli:watch-initialize';

/** JSON-RPC internal error; what in-flight requests get when the reload discards them. */
const RESTART_ERROR_CODE = -32603;

/** A single JSON-RPC message. Only the routing fields are read; everything else passes through. */
type Frame = {
  id?: string | number;
  method?: string;
};

export type WatchSupervisorOptions = {
  /** Entry re-run under `bun --watch`. Defaults to the CLI's own `src/bin.ts`. */
  entry?: string;
  /** Arguments forwarded to the child. Defaults to this process's, less `--watch`. */
  args?: string[];
};

/**
 * Runs `dx mcp serve` under `bun --watch` and proxies the client's stdio to it, replaying the MCP
 * handshake across each reload so an edit is invisible to the connected client.
 *
 * The watching is delegated to the child because bun tracks exactly the module graph it imported,
 * which is the file set that matters. The cost is that a reload keeps the same pid and the same
 * pipes, wiping only the JS realm: the connection survives but the session state does not, so
 * something outside the realm has to hold the handshake. That is this supervisor.
 */
export const runWatchSupervisor = ({ entry, args }: WatchSupervisorOptions = {}): Effect.Effect<void, WatchError> =>
  Effect.callback<void, WatchError>((resume) => {
    const childEntry = entry ?? fileURLToPath(new URL('../../bin.ts', import.meta.url));
    const childArgs = args ?? process.argv.slice(2).filter((arg) => arg !== '--watch' && !arg.startsWith('--watch='));

    // `--no-clear-screen` because a clear sequence on stdout would corrupt the protocol stream.
    const child = spawn('bun', ['--watch', '--no-clear-screen', 'run', childEntry, ...childArgs], {
      env: { ...process.env, [WATCH_CHILD_ENV]: '1' },
    });

    /** Cached from the client so the handshake can be re-driven into a fresh realm. */
    let initialize: Frame | undefined;
    let initialized: Frame | undefined;
    /** Requests the client is still waiting on; a reload strands them. */
    const pending = new Set<string | number>();
    /** Client traffic held while the child has no session to answer it. */
    const queued: string[] = [];
    let ready = false;
    let starts = 0;
    let stopping = false;

    const toChild = (line: string) => child.stdin.write(`${line}\n`);
    const toClient = (message: unknown) => process.stdout.write(`${JSON.stringify(message)}\n`);
    const note = (message: string) => process.stderr.write(`[dx mcp serve --watch] ${message}\n`);

    const flush = () => {
      for (const line of queued.splice(0)) {
        toChild(line);
      }
    };

    /** Completes the replayed handshake and tells the client its surface may have changed. */
    const completeReplay = () => {
      if (initialized) {
        toChild(JSON.stringify(initialized));
      }
      ready = true;
      flush();
      // Emitted here rather than left to the server: it announces its toolkits while building the
      // layer, which happens before the replay above creates the session to announce them into.
      toClient({ jsonrpc: '2.0', method: 'notifications/tools/list_changed', params: {} });
      toClient({ jsonrpc: '2.0', method: 'notifications/prompts/list_changed', params: {} });
    };

    const onRestart = () => {
      starts += 1;
      if (starts === 1 || !initialize) {
        // Nothing to replay — the client drives the first handshake itself.
        ready = true;
        flush();
        return;
      }

      note(`reloaded, replaying handshake (reload ${starts - 1})`);
      ready = false;
      for (const id of pending) {
        toClient({
          jsonrpc: '2.0',
          id,
          error: { code: RESTART_ERROR_CODE, message: 'Server reloaded; retry the request.' },
        });
      }
      pending.clear();
      toChild(JSON.stringify({ ...initialize, id: REPLAY_ID }));
    };

    const onClientLine = (line: string) => {
      for (const message of parseFrame(line)) {
        if (message.method === 'initialize' && message.id !== undefined) {
          initialize = message;
        } else if (message.method === 'notifications/initialized') {
          initialized = message;
        }
        if (message.method !== undefined && message.id !== undefined) {
          pending.add(message.id);
        }
      }
      ready ? toChild(line) : queued.push(line);
    };

    const onChildLine = (line: string) => {
      const messages = parseFrame(line);
      const single = messages.length === 1 ? messages[0] : undefined;
      if (single?.id === REPLAY_ID) {
        completeReplay();
        return;
      }
      for (const message of messages) {
        if (message.id !== undefined && message.method === undefined) {
          pending.delete(message.id);
        }
      }
      process.stdout.write(`${line}\n`);
    };

    const onChildError = (line: string) => {
      line === WATCH_READY_SENTINEL ? onRestart() : process.stderr.write(`${line}\n`);
    };

    child.stdout.on('data', splitLines(onChildLine));
    child.stderr.on('data', splitLines(onChildError));
    // Surfaced rather than left to throw: a write racing the child's death is EPIPE here, and the
    // exit handler below is what actually reports the failure.
    child.stdin.on('error', (error) => note(`child stdin: ${error.message}`));
    process.stdin.on('data', splitLines(onClientLine));
    process.stdin.on('end', () => {
      stopping = true;
      child.kill('SIGTERM');
    });

    child.on('error', (error) =>
      resume(Effect.fail(new WatchError({ message: 'Failed to start `bun --watch`.', cause: error }))),
    );
    child.on('exit', (code, signal) =>
      resume(
        stopping
          ? Effect.void
          : Effect.fail(
              new WatchError({
                message: `Watched server exited (code ${code ?? 'none'}, signal ${signal ?? 'none'}).`,
              }),
            ),
      ),
    );

    return Effect.sync(() => {
      stopping = true;
      child.kill('SIGTERM');
    });
  });

/** Splits a byte stream into NDJSON lines — the framing `McpServer.layerStdio` uses. */
const splitLines = (onLine: (line: string) => void) => {
  let buffer = '';
  return (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    for (let index = buffer.indexOf('\n'); index !== -1; index = buffer.indexOf('\n')) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (line.length > 0) {
        onLine(line);
      }
    }
  };
};

/** Messages in a line, which may be a JSON-RPC batch; empty when the line is not JSON at all. */
const parseFrame = (line: string): Frame[] => {
  try {
    const parsed = JSON.parse(line);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};
