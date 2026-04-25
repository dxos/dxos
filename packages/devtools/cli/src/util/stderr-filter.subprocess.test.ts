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
 * End-to-end-ish proof that `installStderrFilter()` actually wraps
 * `process.stderr.write` in a real subprocess: spawn the fixture, capture
 * stderr, and assert that the warnings + their stack frames are gone but
 * surrounding real stderr is preserved.
 *
 * This complements the pure unit tests in `stderr-filter.test.ts` (which
 * exercise the state machine) and ensures the integration with Node's
 * stream API works as expected.
 */

describe('installStderrFilter (subprocess)', () => {
  test('drops timeout warnings + stack frames; preserves real lines', ({ expect }) => {
    const result = spawnSync('bun', ['run', '--conditions=source', fixture], {
      encoding: 'utf8',
      timeout: 15_000,
      env: { ...process.env, DX_DEBUG: 'error', NO_COLOR: '1' },
    });
    expect(result.status).toBe(0);
    const stderr = result.stderr ?? '';

    // Real lines preserved.
    expect(stderr).toContain('REAL line before warning');
    expect(stderr).toContain('REAL line after warning');
    expect(stderr).toContain('REAL final line');

    // Warning prefixes and their stack frames stripped.
    expect(stderr).not.toContain('Action `Finding properties');
    expect(stderr).not.toContain('Action `another action');
    expect(stderr).not.toContain('warnAfterTimeout');
    expect(stderr).not.toContain('processTicksAndRejections');
  });
});
