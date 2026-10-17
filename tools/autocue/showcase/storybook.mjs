//
// Copyright 2026 DXOS.org
//

import { spawn } from 'node:child_process';
import path from 'node:path';

const reachable = async (url) => {
  try {
    return (await fetch(`${url}/index.json`, { signal: AbortSignal.timeout(5_000) })).ok;
  } catch {
    return false;
  }
};

/**
 * Ensures a storybook serving the Grid story answers at `url`: reuses one that is up (the one shared storybook), or
 * starts one scoped to tools/autocue and returns it so the caller stops it. `ok: false` when none came up in time.
 */
export const storybook = async ({ root, url, env = process.env, log = console.log }) => {
  if (await reachable(url)) {
    return { ok: true };
  }
  const port = new globalThis.URL(url).port;
  log(`starting a storybook for Grid on :${port}`);
  const child = spawn('bash', ['serve.sh', `--port=${port}`, '--no-open'], {
    cwd: path.join(root, 'tools/storybook-react'),
    env: { ...env, DX_STORIES: '../tools/autocue' },
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  });
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline && child.exitCode === null) {
    if (await reachable(url)) {
      return { ok: true, stop: () => process.kill(-child.pid, 'SIGTERM') };
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  process.kill(-child.pid, 'SIGTERM');
  return { ok: false };
};
