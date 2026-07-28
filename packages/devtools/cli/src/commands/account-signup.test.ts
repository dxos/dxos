//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { runDx, withIsolatedHome } from '../testing';

/**
 * Subprocess tests for `dx account signup`, which @dxos/plugin-client contributes. They live here
 * (rather than in that package) because they exercise the assembled `./bin/dx` binary — the same
 * reason `space-list.test.ts` covers a plugin-contributed command from this package.
 */

/** Strip ANSI so assertions read against plain text. */
const plain = (text: string) => text.replace(/\[[0-9;]*m/g, '');

describe('dx account signup', () => {
  test('is mounted on the account group', ({ expect }) => {
    withIsolatedHome((home) => {
      const { stdout, status } = runDx(['account', '--help'], { home });
      expect(status).toBe(0);
      const help = plain(stdout);
      expect(help).toContain('login');
      expect(help).toContain('logout');
      expect(help).toContain('signup');
    });
  });

  test('advertises its options', ({ expect }) => {
    withIsolatedHome((home) => {
      const { stdout, status } = runDx(['account', 'signup', '--help'], { home });
      expect(status).toBe(0);
      const help = plain(stdout);
      expect(help).toContain('--email');
      expect(help).toContain('--hub-url');
      expect(help).toContain('--no-agent');
    });
  });

  test('rejects a malformed email during option parsing', ({ expect }) => {
    withIsolatedHome((home) => {
      const { stderr, status } = runDx(['account', 'signup', '--email', 'not-an-email'], { home });
      expect(status).not.toBe(0);
      expect(plain(stderr)).toMatch(/email/i);
    });
  });

  test('help text contains no email addresses', ({ expect }) => {
    withIsolatedHome((home) => {
      const { stdout } = runDx(['account', 'signup', '--help'], { home });
      // Option descriptions must never carry a sample address — this repository is public.
      expect(plain(stdout)).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    });
  });
});
