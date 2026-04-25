//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import fs from 'node:fs';
import path from 'node:path';

import { runDx, withIsolatedHome } from '../testing';

/**
 * Subprocess tests for `dx reset`. Uses an isolated HOME so we can safely
 * create sentinel data under the XDG roots and verify the command removes
 * them without touching the developer's real ~/.local/share/dx.
 */

const writeSentinel = (home: string, rel: string): string => {
  const full = path.join(home, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, 'sentinel');
  return full;
};

describe('dx reset', () => {
  test('without --hard exits non-zero and preserves data', ({ expect }) => {
    withIsolatedHome((home) => {
      const sentinel = writeSentinel(home, '.local/share/dx/level/sentinel.txt');
      const { stderr, status } = runDx(['reset'], { home });
      expect(status).not.toBe(0);
      expect(stderr).toMatch(/--hard/);
      // Sentinel still there.
      expect(fs.existsSync(sentinel)).toBe(true);
    });
  });

  test('--hard on default profile removes the XDG data/state/cache roots', ({ expect }) => {
    withIsolatedHome((home) => {
      const dataSentinel = writeSentinel(home, '.local/share/dx/level/sentinel.txt');
      const stateSentinel = writeSentinel(home, '.local/state/dx/something/sentinel.txt');
      const cacheSentinel = writeSentinel(home, '.cache/dx/x/sentinel.txt');

      const { stdout, status } = runDx(['reset', '--hard'], { home });
      expect(status).toBe(0);
      expect(stdout).toContain('Deleted');

      expect(fs.existsSync(dataSentinel)).toBe(false);
      expect(fs.existsSync(stateSentinel)).toBe(false);
      expect(fs.existsSync(cacheSentinel)).toBe(false);
    });
  });

  test('--hard --json reports the deleted paths as JSON', ({ expect }) => {
    withIsolatedHome((home) => {
      writeSentinel(home, '.local/share/dx/level/sentinel.txt');
      const { stdout, status } = runDx(['--json', 'reset', '--hard'], { home });
      expect(status).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed).toMatchObject({ profile: 'default' });
      expect(Array.isArray(parsed.deleted)).toBe(true);
      // At least DX_DATA should be reported since we wrote a sentinel under it.
      expect(parsed.deleted.some((p: string) => p.endsWith('/.local/share/dx'))).toBe(true);
    });
  });

  test('--hard --profile <name> only touches that profile, not the default roots', ({ expect }) => {
    withIsolatedHome((home) => {
      // Named profile paths are under profile/<name>.
      const namedData = writeSentinel(home, '.local/share/dx/profile/my-profile/level/sentinel.txt');
      // Default-profile data lives at the XDG root and MUST survive.
      const defaultData = writeSentinel(home, '.local/share/dx/level/sentinel.txt');

      const { status } = runDx(['--profile', 'my-profile', 'reset', '--hard'], { home });
      expect(status).toBe(0);

      expect(fs.existsSync(namedData)).toBe(false);
      expect(fs.existsSync(defaultData)).toBe(true);
    });
  });
});
