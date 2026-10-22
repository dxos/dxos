//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Path to the `dx` bash wrapper in this package. Tests spawn this rather
 * than importing `bin.ts` directly so they exercise the exact same entry
 * point a user runs, including the `--conditions=source` resolution done
 * by the wrapper.
 */
export const dxBin = path.resolve(dirname, '../../bin/dx');

export type RunDxOptions = {
  /**
   * If set, HOME is redirected to a throwaway tmp dir so the CLI operates
   * on an empty data root (no HALO identity, no keyring, no spaces).
   * `PROTO_HOME` and `PATH` are preserved from the outer process so the
   * bash wrapper can still find `bun` via proto shims.
   */
  isolateHome?: boolean;

  /**
   * Override HOME to a specific path (takes precedence over `isolateHome`).
   * Useful when the caller wants to inspect files in the HOME afterwards.
   */
  home?: string;

  /** Extra env vars to merge on top of process.env. */
  env?: Record<string, string>;

  /** Subprocess timeout in ms (default 30s). */
  timeout?: number;

  /** Stdin contents (for commands that read from stdin). */
  input?: string;
};

export type RunDxResult = {
  stdout: string;
  stderr: string;
  status: number | null;
  /** The HOME used — a tmp dir when `isolateHome` was set, otherwise the caller's. */
  home: string;
};

/**
 * Spawn `./bin/dx` with the given args. Returns a plain result struct so the
 * caller can assert on exit code + streams without dealing with Effect.
 * Asynchronous so that tests in a `describe.concurrent` block overlap their spawns.
 *
 * The caller is responsible for cleanup when using `isolateHome: true` —
 * the helper returns `home` so the test can `fs.rmSync(home, { recursive, force })`.
 * If cleanup is inconvenient, wrap the call in a `try/finally`.
 */
export const runDx = async (args: string[], options: RunDxOptions = {}): Promise<RunDxResult> => {
  const home =
    options.home ??
    (options.isolateHome ? fs.mkdtempSync(path.join(os.tmpdir(), 'dx-test-')) : (process.env.HOME ?? ''));

  // Preserve proto so the `./bin/dx` bash wrapper can resolve `bun`.
  const protoHome = process.env.PROTO_HOME ?? path.join(process.env.HOME ?? '', '.proto');

  const child = spawn(dxBin, args, {
    timeout: options.timeout ?? 30_000,
    env: {
      ...process.env,
      HOME: home,
      PROTO_HOME: protoHome,
      PATH: process.env.PATH ?? '',
      DX_DEBUG: 'error',
      NO_COLOR: '1',
      // These assertions are about the CLI's own stdout: proto's shims switch to an NDJSON
      // reporter when they detect an agent environment (`AI_AGENT`) and announce that on stdout,
      // once per HOME — which every isolated HOME here is.
      PROTO_REPORTER: 'text',
      ...options.env,
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
  child.stdin.end(options.input);
  const status = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code));
  });

  return { stdout, stderr, status, home };
};

/**
 * Convenience: runs a callback against an isolated HOME, then cleans up.
 */
export const withIsolatedHome = async <T>(fn: (home: string) => Promise<T>): Promise<T> => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-test-'));
  try {
    return await fn(home);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
};

/**
 * Heuristic: does stderr contain a genuine Error / stack trace (as opposed
 * to warnings)? Used by tests that assert the CLI exits cleanly.
 */
export const hasErrorTrace = (stderr: string): boolean => /^Error\b|^\s+at [^\s].+:\d+:\d+$/m.test(stderr);
