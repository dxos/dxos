//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const APP_DIR = path.resolve(import.meta.dirname, '../..');

const answers = (origin: string): Promise<string | undefined> =>
  fetch(origin).then(
    (response) => (response.ok ? response.text() : undefined),
    () => undefined,
  );

/**
 * Serves `dist` with `vite preview` on `port`, resolving once that bundle is what the port serves.
 *
 * A server left on the port by an earlier run would otherwise answer every check and serve its own
 * bundle, so a busy port is refused and the served `index.html` must match the one in `dist`.
 */
export const servePreview = async (dist: string, port: number): Promise<{ stop: () => Promise<void> }> => {
  const origin = `http://127.0.0.1:${port}`;
  if ((await answers(origin)) !== undefined) {
    throw new Error(`port ${port} is already serving something; stop it first`);
  }
  const expected = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const preview = spawn(
    'pnpm',
    ['exec', 'vite', 'preview', '--configLoader', 'native', '--port', String(port), '--strictPort', '--outDir', dist],
    { cwd: APP_DIR, detached: true, stdio: 'ignore' },
  );
  const stop = async () => {
    if (preview.pid === undefined) {
      return;
    }
    for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
      try {
        process.kill(-preview.pid, signal);
      } catch {
        return;
      }
      for (let attempt = 0; attempt < 20; attempt++) {
        if ((await answers(origin)) === undefined) {
          return;
        }
        await sleep(250);
      }
    }
  };
  for (let attempt = 0; attempt < 120; attempt++) {
    const served = await answers(origin);
    if (served === expected) {
      return { stop };
    }
    if (served !== undefined) {
      await stop();
      throw new Error(`port ${port} serves a different bundle than ${dist}`);
    }
    await sleep(1_000);
  }
  await stop();
  throw new Error(`vite preview never served ${dist} on port ${port}`);
};
