//
// Copyright 2026 DXOS.org
//

/**
 * Detect whether composer-app:serve is already running on localhost:5173 and
 * start it in the background if not. Skips if already up.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(DEMO_DIR, '..', 'logs');
const DEFAULT_URL = 'http://localhost:5173';

export type DevServerHandle = {
  /** True if we started the process ourselves (as opposed to finding an existing one). */
  readonly started: boolean;
  /** Child process if we spawned it; undefined if one was already running. */
  readonly process?: ChildProcess;
  /** Absolute path to the log file if we spawned the process. */
  readonly logFile?: string;
};

/** Ping `url` with a short timeout; resolve true iff it returns any response. */
export const isUp = async (url: string = DEFAULT_URL, timeoutMs = 2_000): Promise<boolean> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    // Any response at all (including 404) means the port is live.
    return response.status > 0;
  } catch {
    return false;
  }
};

/** Wait until `isUp(url)` returns true, or throw after `timeoutMs`. */
export const waitUntilUp = async (url: string = DEFAULT_URL, timeoutMs = 180_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) {
      return;
    }
    await new Promise((resolveFn) => setTimeout(resolveFn, 1_000));
  }
  throw new Error(`${url} never came up within ${timeoutMs}ms.`);
};

/**
 * Ensure the dev server is running; start it in the background if necessary.
 * Logs go to `tools/demo/logs/dev-server-<timestamp>.log` for debugging.
 */
export const ensureDevServer = async (url: string = DEFAULT_URL): Promise<DevServerHandle> => {
  if (await isUp(url)) {
    return { started: false };
  }

  mkdirSync(LOG_DIR, { recursive: true });
  const logFile = resolve(LOG_DIR, `dev-server-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  const out = createWriteStream(logFile, { flags: 'a' });

  // Run from repo root so moon resolves the task correctly.
  const repoRoot = resolve(DEMO_DIR, '..', '..');
  const process = spawn('moon', ['run', 'composer-app:serve'], {
    cwd: repoRoot,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...globalThis.process.env, CI: 'true' },
  });
  process.stdout?.pipe(out);
  process.stderr?.pipe(out);
  // Don't let dev-server crashes bring down this script silently.
  process.on('exit', (code, signal) => {
    out.write(`\n[dev-server exited code=${code} signal=${signal}]\n`);
  });

  await waitUntilUp(url);
  return { started: true, process, logFile };
};
