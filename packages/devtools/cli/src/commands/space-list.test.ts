//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import fs from 'node:fs';

import { hasErrorTrace, runDx, withIsolatedHome } from '../testing';

/**
 * End-to-end subprocess test for `dx space list`. Uses a throwaway HOME so
 * the command operates on an empty data dir (no HALO identity, no spaces)
 * — the "just initialized the CLI" state.
 *
 * Correct behaviour in that state:
 *   - text mode: exit 0, stdout empty (or whitespace only).
 *   - --json mode: exit 0, stdout === "[]" (plus trailing newline).
 *   - stderr must NOT contain a stack trace.
 */

describe('space list', () => {
  test('fresh profile (no HALO) — exits 0, empty stdout, no error trace', ({ expect }) => {
    withIsolatedHome((home) => {
      const { stdout, stderr, status } = runDx(['space', 'list'], { home });
      if (status !== 0) {
        // eslint-disable-next-line no-console
        console.error('stdout:', stdout, '\nstderr:', stderr);
      }
      expect(status).toBe(0);
      expect(stdout.trim()).toBe('');
      expect(hasErrorTrace(stderr)).toBe(false);
    });
  });

  test('fresh profile (no HALO) with --json — exits 0, stdout === "[]"', ({ expect }) => {
    const home = fs.mkdtempSync('/tmp/dx-test-');
    try {
      const { stdout, stderr, status } = runDx(['--json', 'space', 'list'], { home });
      if (status !== 0) {
        // eslint-disable-next-line no-console
        console.error('stdout:', stdout, '\nstderr:', stderr);
      }
      expect(status).toBe(0);
      expect(stdout.trim()).toBe('[]');
      expect(hasErrorTrace(stderr)).toBe(false);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
