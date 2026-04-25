//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const dxBin = path.resolve(dirname, '../../../bin/dx');

/**
 * Smoke test that the `chat` subcommand is wired into the CLI: invoke
 * `./bin/dx chat --help` and verify the output advertises the command and
 * its key options. The dispatcher returns immediately on `--help` without
 * activating the plugin layer or starting any UI.
 */
const runDx = (args: string[]): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync(dxBin, args, {
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, DX_DEBUG: 'error', NO_COLOR: '1' },
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
};

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
