//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { runDx } from '../../testing';

/**
 * Smoke test that the `chat` subcommand is wired into the CLI: invoke
 * `./bin/dx chat --help` and verify the output advertises the command and
 * its key options. The dispatcher returns immediately on `--help` without
 * activating the plugin layer or starting any UI.
 */

describe('chat command', () => {
  test('--help describes the command and its options', ({ expect }) => {
    const { stdout, status } = runDx(['chat', '--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('chat');
    expect(stdout).toContain('Open chat interface.');
    expect(stdout).toMatch(/--provider/);
    expect(stdout).toMatch(/--model/);
    expect(stdout).toMatch(/--blueprint/);
    expect(stdout).toMatch(/--debug/);
  });
});
