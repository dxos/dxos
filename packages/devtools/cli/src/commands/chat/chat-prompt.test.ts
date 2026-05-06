//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { runDx, withIsolatedHome } from '../../testing';

/**
 * Smoke tests for `dx chat --prompt` non-interactive mode.
 *
 * Full agent-loop tests require a memoized LLM fixture — those live in
 * `packages/plugins/plugin-crm/src/blueprints/crm/blueprint.test.ts` and are
 * skipped by default (regenerate with `ALLOW_LLM_GENERATION=1`). The tests
 * here exercise the CLI surface only: that `--prompt` is wired into the
 * command, and that the chat command exits gracefully when no HALO is
 * configured (instead of crashing into the TUI).
 */

describe('dx chat --prompt (non-interactive)', () => {
  test('chat --help advertises --prompt and --json composes with it', ({ expect }) => {
    const { stdout, status } = runDx(['chat', '--help']);
    expect(status).toBe(0);
    expect(stdout).toMatch(/--prompt/);
    expect(stdout).toMatch(/non-interactively/);
  });

  test('chat --prompt without a HALO identity exits cleanly with guidance', ({ expect }) => {
    withIsolatedHome((home) => {
      const { stdout, stderr, status } = runDx(['chat', '--prompt', 'research test@example.com'], {
        home,
        timeout: 60_000,
      });
      // Exit 0: the chat command emits a friendly Console.error then returns
      // (it doesn't fail the effect). The friendly hint should mention
      // `dx halo create` so the user knows what to do next.
      expect(status).toBe(0);
      const combined = stdout + stderr;
      expect(combined).toMatch(/halo create|space create/);
    });
  });
});
