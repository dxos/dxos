//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(dirname, 'parsimmon.fixture.mjs');

/**
 * `#parsimmon` has to yield a usable parsimmon under plain Node ESM, not only under a bundler:
 * blade-runner's EDGE plans run as `node --import tsx` and every combinator in `transform.ts`
 * evaluates at module load, so a namespace holding `default` alone fails the whole process before
 * any test runs. Vite's CJS interop hands back a populated namespace either way, so this is the
 * only place the regression is visible.
 */
describe('#parsimmon (subprocess)', () => {
  test('exposes combinators when loaded by plain Node', ({ expect }) => {
    const result = spawnSync(process.execPath, [fixture], { encoding: 'utf8', timeout: 15_000 });
    // Asserted together because Node's stderr carries the diagnosis when the interop regresses,
    // and a bare exit code does not.
    expect({ status: result.status, stderr: result.stderr ?? '' }).toEqual({ status: 0, stderr: '' });
    expect(result.stdout).toContain('parsimmon ok');
  });
});
