//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { log } from '@dxos/log';

import { Shell } from '#shell';

import { materializeScripts } from './apply-edits-program.ts';
import { resolveWithin } from './path-scope.ts';

// Raw promises throughout: this module is the node platform boundary (a connect middleware over
// `child_process` and stream callbacks), and an Effect runtime inside a dev-server request handler
// would buy nothing a `Promise` does not already do here.

/** Default wall-clock budget for one script. */
export const DEFAULT_TIMEOUT = 60_000;

/** Ceiling a request's own `timeout` is clamped to, so a caller cannot pin a dev server forever. */
export const MAX_TIMEOUT = 600_000;

/** Per-stream output cap, in characters; beyond this the stream is clipped and `truncated` is set. */
export const MAX_OUTPUT_CHARS = 200_000;

export type MakeOptions = {
  /** Root every script starts in; a request may name a subdirectory but never escape it. */
  root: string;
  timeout?: number;
  maxTimeout?: number;
  maxOutputChars?: number;
  /** Route to answer on; defaults to {@link Shell.PATH}. */
  path?: string;
  /** Shell binary; defaults to `bash`. */
  shell?: string;
};

type RunOptions = Shell.Request & {
  cwd: string;
  scriptsDir: string;
  root: string;
  shell: string;
  timeout: number;
  maxOutputChars: number;
};

/**
 * Connect-style middleware exposing the harness's one verb: run a script, return its result.
 *
 * Hosted by whichever dev server serves the app, so the browser reaches it same-origin — no CORS, no
 * second process to supervise, and nothing at all in a deployed build.
 *
 * The route runs arbitrary shell commands as the developer, which is the point of a coding harness
 * and also its whole risk: mounting it is an explicit opt-in (see `computer-shell-plugin.ts`), and
 * the request checks below exist so *only* the page the developer opened can reach it.
 */
export const make = ({
  root,
  timeout: defaultTimeout = DEFAULT_TIMEOUT,
  maxTimeout = MAX_TIMEOUT,
  maxOutputChars = MAX_OUTPUT_CHARS,
  path = Shell.PATH,
  shell = 'bash',
}: MakeOptions) => {
  // Canonicalized once, at mount: every path the host hands out (a request's `cwd`, and the root the
  // editor checks its own paths against) has to be the same shape, or a symlinked root — `/tmp` on
  // macOS — makes every file inside it look like an escape.
  const realRoot = resolveWithin(root);
  const scriptsDir = materializeScripts();
  // Debug, not info: the route mounts in every dev server this plugin is added to, and most sessions
  // never call it — but the mounted root is the first thing to check when a tool misbehaves.
  log.debug('computer shell mounted', { path, root: realRoot, scriptsDir });

  return async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    if (req.method !== 'POST' || !req.url?.startsWith(path)) {
      return next();
    }

    // A JSON content type is not a formality: it is the one request a cross-origin page cannot send
    // without a preflight, and this route answers no preflight — so the browser blocks any caller
    // other than the app itself. `text/plain` would sail straight through as a simple request.
    if (!req.headers['content-type']?.includes('application/json')) {
      return fail(res, 415, 'content-type must be application/json');
    }

    // Belt to the same braces, for a client that is not a browser and sends the header anyway.
    const origin = req.headers.origin;
    if (origin && hostOf(origin) !== req.headers.host) {
      return fail(res, 403, 'cross-origin request');
    }

    let request: Shell.Request;
    try {
      request = JSON.parse(await readBody(req));
    } catch (error) {
      return fail(res, 400, `unparseable request: ${String(error)}`);
    }
    if (typeof request.script !== 'string' || request.script.trim().length === 0) {
      return fail(res, 400, 'script must be a non-empty string');
    }

    let cwd: string;
    try {
      cwd = resolveWithin(realRoot, request.cwd);
    } catch (error) {
      return fail(res, 400, String(error));
    }

    // Bounded metadata only: a script can carry credentials, and its output can carry the contents
    // of any file the developer can read — neither belongs in a log sink.
    log.info('exec', { cwd, scriptLength: request.script.length, hasStdin: request.stdin !== undefined });

    const result = await run({
      ...request,
      cwd,
      root: realRoot,
      scriptsDir,
      shell,
      maxOutputChars,
      timeout: clampTimeout(request.timeout, defaultTimeout, maxTimeout),
    });

    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' });
    res.end(JSON.stringify(result));
  };
};

/** An opaque origin — `null`, from a sandboxed frame — has no host, so it can never match. */
const hostOf = (origin: string): string | undefined => {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
};

/**
 * A requested timeout only narrows the host's default.
 *
 * Anything unusable falls back rather than clamping: `Math.min` propagates `NaN` from a malformed
 * request, and `setTimeout(fn, NaN)` fires on the next tick — killing the script instantly and
 * reporting a timeout that never happened.
 */
const clampTimeout = (requested: number | undefined, fallback: number, max: number): number =>
  typeof requested === 'number' && Number.isFinite(requested) && requested > 0 ? Math.min(requested, max) : fallback;

const fail = (res: ServerResponse, status: number, error: string): void => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error }));
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    // Chunks are concatenated as bytes and decoded once: appending them as strings decodes each
    // independently, so a multi-byte character split across two packets arrives as replacement
    // characters — and an edit payload carries text destined for a file.
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

/**
 * Runs one script to completion.
 *
 * The child gets its own process group (`detached`) so a timeout can kill everything it started
 * rather than only the shell — a backgrounded build would otherwise outlive the request that
 * spawned it and keep writing to a dead pipe.
 */
const run = ({
  script,
  stdin,
  cwd,
  root,
  scriptsDir,
  shell,
  timeout,
  maxOutputChars,
}: RunOptions): Promise<Shell.Result> =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(shell, ['-c', script], {
      cwd,
      detached: true,
      env: { ...process.env, [Shell.SCRIPTS_ENV]: scriptsDir, [Shell.ROOT_ENV]: root },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let truncated = false;
    const collect = () => {
      let text = '';
      return {
        get: () => text,
        append: (chunk: string) => {
          const room = maxOutputChars - text.length;
          if (room <= 0) {
            truncated = true;
            return;
          }
          if (chunk.length > room) {
            truncated = true;
          }
          text += chunk.slice(0, room);
        },
      };
    };

    const stdout = collect();
    const stderr = collect();
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', stdout.append);
    child.stderr.on('data', stderr.append);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      const { pid } = child;
      if (pid === undefined) {
        return;
      }
      try {
        // Negative pid: the group, not just the shell.
        process.kill(-pid, 'SIGKILL');
      } catch (error) {
        log.warn('failed to kill script', { error: String(error) });
      }
    }, timeout);

    // A script that never reads stdin (`echo hi`) closes the pipe under us; without a handler that
    // EPIPE would surface as an unhandled error event and take the dev server down.
    child.stdin.on('error', () => {});
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    const finish = (exitCode: number | null, signal: string | null) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.get(),
        stderr: stderr.get(),
        exitCode,
        signal: signal ?? undefined,
        timedOut,
        truncated,
        cwd,
        durationMs: Date.now() - started,
      });
    };

    child.on('close', finish);
    child.on('error', (error) => {
      stderr.append(String(error));
      finish(null, null);
    });
  });
