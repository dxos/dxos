//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(dirname, 'stderr-filter.fixture.ts');

/**
 * End-to-end-ish proof that `installStderrFilter()` actually intercepts the
 * APIs production code uses: `console.warn` (where `warnAfterTimeout` from
 * @dxos/debug writes) AND `process.stderr.write` (defence in depth).
 *
 * Bun bypasses `process.stderr.write` for `console.warn` — overriding only
 * one channel is the bug this PR fixes. The fixture exercises BOTH so a
 * regression in either channel is caught immediately.
 */

describe('installStderrFilter (subprocess)', () => {
  test('drops warnings emitted via console.warn AND process.stderr.write; preserves real lines', ({ expect }) => {
    const result = spawnSync('bun', ['run', '--conditions=source', fixture], {
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, DX_DEBUG: 'error', NO_COLOR: '1' },
    });
    expect(result.status).toBe(0);
    const stderr = result.stderr ?? '';

    // Real stderr from BOTH channels must pass through.
    expect(stderr).toContain('REAL warn before warning');
    expect(stderr).toContain('REAL error after warning');
    expect(stderr).toContain('REAL line via process.stderr.write');
    expect(stderr).toContain('REAL final line via process.stderr.write');

    // Warning prefixes (and anything in their stack frames) must be gone.
    expect(stderr).not.toContain('Action `Finding properties');
    expect(stderr).not.toContain('Action `another action');
    expect(stderr).not.toContain('warnAfterTimeout');
    expect(stderr).not.toContain('processTicksAndRejections');
  });
});
