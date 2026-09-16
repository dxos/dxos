//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const SCRIPT = path.resolve(dirname, 'bootstrap-profile.ts');

/**
 * Gives the CLI profile under `home` a HALO identity and one space, and returns the space id.
 *
 * Spawned rather than imported: the script builds a `Client` of its own and the client leaves a
 * worker and sockets behind, which inside a vitest worker outlives the test that made it.
 */
export const bootstrapProfile = (home: string, timeout = 300_000): string => {
  const { stdout, stderr, status } = spawnSync('bun', ['run', SCRIPT], {
    encoding: 'utf8',
    timeout,
    env: {
      ...process.env,
      HOME: home,
      PROTO_HOME: process.env.PROTO_HOME ?? path.join(process.env.HOME ?? '', '.proto'),
      PATH: process.env.PATH ?? '',
      DX_DEBUG: 'error',
      NO_COLOR: '1',
      PROTO_REPORTER: 'text',
      // What `bin/dx` sets in this checkout. This process is the one that first materializes the
      // profile config, so without it the whole suite would be pinned to the production EDGE
      // rather than the staging worker the monorepo targets.
      DX_LOCAL_DEV: process.env.DX_LOCAL_DEV ?? '1',
    },
  });
  if (status !== 0) {
    throw new Error(`bootstrap-profile failed (${status}): ${stderr}`);
  }
  // Parsed defensively: a `bun` warning or a stray log line on stdout is not JSON, and letting
  // `JSON.parse` throw would hide the actual output behind a SyntaxError.
  const last = stdout.trim().split('\n').at(-1) ?? '';
  let spaceId: unknown;
  try {
    ({ spaceId } = JSON.parse(last));
  } catch {
    throw new Error(`bootstrap-profile printed no JSON: ${stdout}`);
  }
  if (typeof spaceId !== 'string') {
    throw new Error(`bootstrap-profile printed no space id: ${stdout}`);
  }
  return spaceId;
};
