//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** composer-app package root (configs and servers run from here). */
export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export type WebServerOptions = {
  command: string[];
  port: number;
  /** Startup budget; vite preview is fast, dev pre-bundling and storybook are not. */
  timeout?: number;
  /** Attach to an already-listening server instead of failing (storybook workflow). */
  reuseExisting?: boolean;
};

/**
 * The production e2e suite requires a bundle built without the PWA service worker;
 * a stale SW intercepts reloads mid-test and poisons subsequent runs.
 */
export const assertPwaDisabled = (): void => {
  if (process.env.DX_PWA !== 'false') {
    throw new Error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  }
};

const isListening = async (port: number): Promise<boolean> => {
  try {
    await fetch(`http://localhost:${port}`, { method: 'HEAD' });
    return true;
  } catch {
    return false;
  }
};

/**
 * Spawn the app web server for the suite and return a teardown that kills the whole
 * process group (pnpm wraps vite, so killing only the direct child leaks the server).
 */
export const startWebServer = async (options: WebServerOptions): Promise<() => Promise<void>> => {
  const { command, port, timeout = 300_000, reuseExisting = false } = options;

  if (await isListening(port)) {
    if (reuseExisting) {
      return async () => {};
    }
    throw new Error(`Port ${port} is already in use — stop the stale server before running the e2e suite.`);
  }

  const child = spawn(command[0], command.slice(1), {
    cwd: packageRoot,
    stdio: 'inherit',
    detached: true,
    env: process.env,
  });

  const deadline = Date.now() + timeout;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`Web server exited with code ${child.exitCode} before listening on port ${port}.`);
    }
    if (await isListening(port)) {
      break;
    }
    if (Date.now() >= deadline) {
      try {
        process.kill(-child.pid!, 'SIGTERM');
      } catch {}
      throw new Error(`Timed out after ${timeout}ms waiting for web server on port ${port}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return async () => {
    try {
      process.kill(-child.pid!, 'SIGTERM');
    } catch {}
  };
};
