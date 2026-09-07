//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { type FSWatcher, watch as watchPath } from 'node:fs';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { fileURLToPath } from 'node:url';

import { BaseError } from '@dxos/errors';

import { WATCH_CHILD_ENV, parseReady } from './watch-protocol';

export class WatchError extends BaseError.extend('WatchError', 'MCP watch supervisor error') {}

/**
 * Id for the handshake replayed into a reloaded child. Namespaced so a client's own id cannot
 * collide with it, and the response is dropped rather than forwarded — the client already holds an
 * `initialize` result from before the reload.
 */
const REPLAY_ID = '@dxos/cli:watch-initialize';

/** JSON-RPC internal error; what in-flight requests get when the reload discards them. */
const RESTART_ERROR_CODE = -32603;

/** An editor writes a file several times per save, so the restart waits for the writes to settle. */
const SETTLE_MS = 150;

/** A child that ignores SIGTERM would otherwise wedge the supervisor forever. */
const KILL_GRACE_MS = 2_000;

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
  /** Force the binary strategy. Defaults to whether this is the compiled binary. */
  bundled?: boolean;
  /** Executable the binary strategy re-runs. Defaults to this process's own. */
  execPath?: string;
};

/**
 * Runs `dx mcp serve` as a child and proxies the client's stdio to it, replaying the MCP handshake
 * across each reload so an edit is invisible to the connected client.
 *
 * Two strategies, because what can change differs by build:
 *
 * - **From source**, `bun --watch` runs the child and tracks exactly the module graph it imported,
 *   which is the right file set and costs nothing to maintain. It reloads *in place* — same pid,
 *   same pipes, wiped JS realm — so the connection survives while the session state does not.
 * - **From the binary**, there are no sources and bun's watcher is not in the artifact, so the
 *   supervisor re-runs a copy of itself and watches the directories the child reports: its
 *   dev-installed plugins, the only on-disk code a shipped `dx` can see change.
 *
 * Either way something outside the reloaded realm has to hold the handshake. That is this
 * supervisor, and it is identical for both.
 */
export const runWatchSupervisor = ({ entry, args, bundled, execPath }: WatchSupervisorOptions = {}): Effect.Effect<
  void,
  WatchError
> =>
  Effect.callback<void, WatchError>((resume) => {
    const isBundled = bundled ?? globalThis.DX_CLI_BUNDLED === true;
    const childEntry = entry ?? fileURLToPath(new URL('../../bin.ts', import.meta.url));
    const childArgs = args ?? process.argv.slice(2).filter((arg) => arg !== '--watch' && !arg.startsWith('--watch='));

    /** Cached from the client so the handshake can be re-driven into a fresh realm. */
    let initialize: Frame | undefined;
    let initialized: Frame | undefined;
    /** Requests the client is still waiting on; a reload strands them. */
    const pending = new Set<string | number>();
    /** Client traffic held while the child has no session to answer it. */
    const queued: string[] = [];
    /** Directories watched under the binary strategy, keyed by path so re-arming is a diff. */
    const watchers = new Map<string, FSWatcher>();
    let child: ChildProcessWithoutNullStreams;
    let ready = false;
    let starts = 0;
    let stopping = false;
    let restarting = false;
    let failed = false;
    let settle: NodeJS.Timeout | undefined;

    /** Resumes at most once — `error` and `exit` can both fire for the same dead child. */
    const fail = (error: WatchError) => {
      if (failed || stopping) {
        return;
      }
      failed = true;
      resume(Effect.fail(error));
    };

    /** SIGTERM with a SIGKILL escalation, unref'd so a clean exit is not held open by the timer. */
    const killChild = () => {
      const target = child;
      target.kill('SIGTERM');
      const escalate = setTimeout(() => target.kill('SIGKILL'), KILL_GRACE_MS);
      escalate.unref();
      target.once('exit', () => clearTimeout(escalate));
    };

    /** Writes a client line to the child, recording the requests the child now owes answers to. */
    const sendToChild = (line: string) => {
      for (const message of parseFrame(line)) {
        if (message.method !== undefined && message.id !== undefined) {
          pending.add(message.id);
        }
      }
      child.stdin.write(`${line}\n`);
    };

    const flush = () => {
      for (const line of queued.splice(0)) {
        sendToChild(line);
      }
    };

    /** Completes the replayed handshake and tells the client its surface may have changed. */
    const completeReplay = () => {
      if (initialized) {
        child.stdin.write(`${JSON.stringify(initialized)}\n`);
      }
      ready = true;
      flush();
      // Emitted here rather than left to the server: it announces its toolkits while building the
      // layer, which happens before the replay above creates the session to announce them into.
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/tools/list_changed', params: {} })}\n`,
      );
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/prompts/list_changed', params: {} })}\n`,
      );
    };

    // Two windows are accepted as inherent to in-place reload: a frame sent between bun's realm
    // wipe and the sentinel can be rejected by the half-started realm, and an edit that fails to
    // load produces no sentinel at all — the child's stderr shows the crash, and the next good
    // edit recovers.
    const onReady = (paths: readonly string[]) => {
      starts += 1;
      armWatchers(paths);
      if (starts === 1 || !initialize) {
        // Nothing to replay — the client drives the first handshake itself.
        ready = true;
        flush();
        return;
      }

      process.stderr.write(`[dx mcp serve --watch] reloaded, replaying handshake (reload ${starts - 1})\n`);
      ready = false;
      for (const id of pending) {
        process.stdout.write(
          `${JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code: RESTART_ERROR_CODE, message: 'Server reloaded; retry the request.' },
          })}\n`,
        );
      }
      pending.clear();
      child.stdin.write(`${JSON.stringify({ ...initialize, id: REPLAY_ID })}\n`);
    };

    const onClientLine = (line: string) => {
      for (const message of parseFrame(line)) {
        if (message.method === 'initialize' && message.id !== undefined) {
          initialize = message;
        } else if (message.method === 'notifications/initialized') {
          initialized = message;
        }
      }
      // A queued request is not yet pending — `pending` holds only ids the child has seen, so a
      // reload errors exactly the requests it stranded while the flush delivers the rest once.
      ready ? sendToChild(line) : queued.push(line);
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
      const readyLine = parseReady(line);
      if (!readyLine) {
        process.stderr.write(`${line}\n`);
        return;
      }
      if (readyLine.malformed) {
        // Silently arming nothing would look identical to having no dev plugins.
        process.stderr.write('[dx mcp serve --watch] ready payload malformed; watching nothing\n');
      }
      onReady(readyLine.watch);
    };

    /**
     * Re-arms the watch set to what the child just reported. Only the binary strategy needs it —
     * under `bun --watch` a linked plugin is already in the module graph, and a second watcher
     * would race bun's in-place reload with a process kill.
     */
    const armWatchers = (paths: readonly string[]) => {
      if (!isBundled) {
        return;
      }
      for (const [path, watcher] of watchers) {
        if (!paths.includes(path)) {
          watcher.close();
          watchers.delete(path);
        }
      }
      for (const path of paths) {
        if (watchers.has(path)) {
          continue;
        }
        try {
          watchers.set(
            path,
            watchPath(path, { recursive: true }, () => scheduleRestart()),
          );
        } catch (error) {
          // A dev plugin whose directory has been moved or deleted should not take the server down.
          process.stderr.write(`[dx mcp serve --watch] cannot watch ${path}: ${(error as Error).message}\n`);
        }
      }
      if (starts === 1) {
        process.stderr.write(
          `[dx mcp serve --watch] ${
            watchers.size > 0 ? `watching ${watchers.size} dev plugin(s)` : 'no dev plugins installed; nothing to watch'
          }\n`,
        );
      }
    };

    const scheduleRestart = () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (stopping || restarting) {
          return;
        }
        restarting = true;
        killChild();
      }, SETTLE_MS);
    };

    const spawnChild = () => {
      if (isBundled) {
        // Re-runs this very binary; `WATCH_CHILD_ENV` is what stops the copy supervising in turn.
        child = spawn(execPath ?? process.execPath, childArgs, {
          env: { ...process.env, [WATCH_CHILD_ENV]: '1' },
        });
      } else {
        // `--no-clear-screen` because a clear sequence on stdout would corrupt the protocol stream.
        const bunArgs = ['--watch', '--no-clear-screen'];
        // `--watch` implies source resolution: without it every `@dxos/*` import resolves to `dist`,
        // so editing a plugin's source changes nothing the watcher tracks until that package is
        // rebuilt — the reload would fire on builds rather than on edits. `DX_SOURCE=0` opts out.
        if (process.env.DX_SOURCE !== '0') {
          bunArgs.push('--conditions=source');
        }
        // Pinned to the package that owns the entry because bun resolves `tsconfig.json` from the
        // cwd, not from the file it is compiling. `--conditions=source` makes it transpile every
        // `@dxos/*` package from TypeScript, and without the `experimentalDecorators` that tsconfig
        // carries it applies TC39 semantics to legacy decorators — `@synchronized` then dies on
        // `descriptor.value` deep in client startup. An MCP client launches `dx` from the user's
        // own project, so inheriting that cwd broke the child every time.
        // The pinned cwd would re-anchor a relative `--config`, so it is resolved against the
        // invocation directory the user actually meant first.
        child = spawn('bun', [...bunArgs, 'run', childEntry, ...absolutizeConfigArg(childArgs)], {
          cwd: fileURLToPath(new URL('../../..', import.meta.url)),
          env: { ...process.env, [WATCH_CHILD_ENV]: '1' },
        });
      }

      child.stdout.on('data', splitLines(onChildLine));
      child.stderr.on('data', splitLines(onChildError));
      // Surfaced rather than left to throw: a write racing the child's death is EPIPE here, and the
      // exit handler below is what actually reports the failure.
      child.stdin.on('error', (error) =>
        process.stderr.write(`[dx mcp serve --watch] child stdin: ${error.message}\n`),
      );
      child.on('error', (error) =>
        fail(new WatchError({ message: 'Failed to start the watched server.', cause: error })),
      );
      child.on('exit', (code, signal) => {
        if (failed) {
          return;
        }
        // `!stopping` because a disconnect racing a reload must win — a respawn here would outlive
        // the client, answered by nobody, and the shutdown below would never resolve.
        if (restarting && !stopping) {
          // Expected: the binary strategy kills its own child to reload it.
          restarting = false;
          ready = false;
          spawnChild();
          return;
        }
        if (stopping) {
          resume(Effect.void);
          return;
        }
        fail(
          new WatchError({
            message: `Watched server exited (code ${code ?? 'none'}, signal ${signal ?? 'none'}).`,
          }),
        );
      });
    };

    spawnChild();

    process.stdin.on('data', splitLines(onClientLine));
    process.stdin.on('end', () => {
      stopping = true;
      killChild();
    });
    // A client that dies without closing our stdin surfaces as EPIPE here; treat it as a disconnect.
    process.stdout.on('error', () => {
      stopping = true;
      killChild();
    });

    return Effect.sync(() => {
      stopping = true;
      clearTimeout(settle);
      for (const watcher of watchers.values()) {
        watcher.close();
      }
      killChild();
    });
  });

/** Splits a byte stream into NDJSON lines — the framing `McpServer.layerStdio` uses. */
const splitLines = (onLine: (line: string) => void) => {
  // A pipe chunk can end mid-codepoint; the decoder carries the partial bytes to the next chunk.
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  return (chunk: Buffer) => {
    buffer += decoder.write(chunk);
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
    // `'null'` parses but is no frame, and reading `.method` off it would crash the proxy.
    return (Array.isArray(parsed) ? parsed : [parsed]).filter(
      (entry): entry is Frame => typeof entry === 'object' && entry !== null,
    );
  } catch {
    return [];
  }
};

/**
 * Resolves a relative `--config`/`-c` value against the invocation cwd, because the source
 * strategy pins the child's cwd elsewhere and `ConfigService.load` uses the path verbatim.
 * Mirrors the forms `readRootFlag` in `bin.ts` accepts.
 */
const absolutizeConfigArg = (args: readonly string[]): string[] =>
  args.map((arg, index) => {
    const previous = args[index - 1];
    if ((previous === '--config' || previous === '-c') && !isAbsolute(arg)) {
      return resolvePath(arg);
    }
    if (arg.startsWith('--config=') && !isAbsolute(arg.slice('--config='.length))) {
      return `--config=${resolvePath(arg.slice('--config='.length))}`;
    }
    return arg;
  });
