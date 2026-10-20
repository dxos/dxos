//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';
import { keptVerdict } from './kept-verdict.ts';
import { SEED_PATH } from './kernel/main.ts';

const { root, scratch, file, deus } = cliHarness('deus-dogfood-');

// A file of its own: the slowest CLI test, run in parallel with the others, which slows it past 180 s on CI.
describe('deus CLI dogfooding', () => {
  // Dogfooding: the toolchain's own sources go into a codebase, and its tests and theorems run there.
  test(
    'adds the compiler to a codebase and passes its own tests and theorems',
    { timeout: 360_000 },
    ({ expect, skip }) => {
      const kept = keptVerdict('dogfood', [SEED_PATH, join(root, 'deus'), join(root, 'src/kernel')]);
      if (kept.held) {
        skip('the seed, deus/ and the kernel are as they were when this passed');
      }
      const codebase = join(scratch, 'self');
      expect(deus('init', '--empty', '--codebase', codebase).code).toBe(0);
      const add = deus('add', join(root, 'deus'), '--codebase', codebase);
      expect(add.stderr).toBe('');
      expect(add.code).toBe(0);
      const tests = deus('test', '--codebase', codebase);
      expect(tests.stdout).toMatch(/ 0 failed/);
      expect(tests.code).toBe(0);
      const theorems = deus('check', '--codebase', codebase);
      expect(theorems.stdout).toMatch(/proved by decide/);
      expect(theorems.code).toBe(0);

      // `view` prints source that compiles back to the same hashes: every definition, test, type and
      // ability of the toolchain, printed together so that mutually recursive ones are re-added as a group.
      const names: { name: string; kind: string; hash: string; sig: string; summary: string; status: string }[] =
        JSON.parse(deus('ls', '--json', '--codebase', codebase).stdout);
      const printed = names
        .filter((entry) => ['term', 'test', 'type', 'ability'].includes(entry.kind) && !entry.hash.startsWith('#'))
        .map((entry) => entry.name);
      expect(printed.length).toBeGreaterThan(1000);
      const source = deus('view', ...printed, '--codebase', codebase)
        .stdout.split('\n')
        // Only the header view writes above each definition goes; a `--` comment of the source stays.
        .filter(
          (line) =>
            !/^-- (\S+ #[0-9a-f]{10}|: .*|a field of structure \S+|a constructor of .*|an operation of .*|builtin)$/.test(
              line,
            ),
        )
        .join('\n');
      expect(deus('update', file('printed.deus', source), '--codebase', codebase).stdout).toBe('Nothing changed.\n');
      kept.record();
    },
  );
});
