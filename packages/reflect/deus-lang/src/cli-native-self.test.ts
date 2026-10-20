//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';
import { keptVerdict } from './kept-verdict.ts';
import { SEED_PATH } from './kernel/main.ts';

const { root, scratch, deus, deusNode } = cliHarness('cli-native-self-');

/** What a native build's result depends on: the seed that runs the build, the sources, the kernel and the compiler. */
const kept = (name: string, example: string) =>
  keptVerdict(
    import.meta.filename,
    name,
    [SEED_PATH, join(root, 'deus'), join(root, 'src/kernel'), join(root, example)],
    spawnSync('cc', ['--version'], { encoding: 'utf8' }).stdout ?? '',
  );

// The toolchain built natively from its own source: the two slowest native tests, in a file of their own so they run
// in parallel with the other back ends.
describe('deus built natively', () => {
  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'builds the compiler natively, and it writes the seed image',
    { timeout: 240_000 },
    ({ expect, skip }) => {
      const verdict = kept('native-compiler', 'examples/compiler.deus');
      if (verdict.held) {
        skip('the seed, deus/, the kernel and cc are as they were when this passed');
      }
      const c = ['--codebase', join(scratch, 'compiler')];
      deus('init', '--empty', ...c);
      expect(deus('add', join(root, 'deus'), join(root, 'examples/compiler.deus'), ...c).code).toBe(0);
      const out = join(scratch, 'deusc');
      expect(deus('build', 'NativeCompiler.main', '-o', out, '--c', ...c).code).toBe(0);
      const image = join(scratch, 'native.image');
      const run = spawnSync(out, [image, join(root, 'deus')], {
        encoding: 'utf8',
        env: { ...process.env, DEUS_HEAP_STATS: '1' },
      });
      expect(run.status).toBe(0);
      expect(run.stderr).toContain(', 0 live,');
      expect(readFileSync(image, 'utf8')).toBe(readFileSync(join(root, 'seed/deus.image'), 'utf8'));
      verdict.record();
    },
  );

  test.skipIf(spawnSync('cc', ['--version']).status !== 0)(
    'builds the deus CLI natively, which writes the same codebase',
    { timeout: 400_000 },
    ({ expect, skip }) => {
      const verdict = kept('native-cli', 'examples/structural.deus');
      if (verdict.held) {
        skip('the seed, deus/, the kernel and cc are as they were when this passed');
      }
      const c = ['--codebase', join(scratch, 'cli-source')];
      deus('init', '--empty', ...c);
      expect(deus('add', join(root, 'deus'), ...c).code).toBe(0);
      const native = join(scratch, 'deus-native');
      // Unoptimized C builds the whole CLI in a fifth of the time, and this test only needs it to run.
      const level = process.env.DEUS_CC_OPT;
      process.env.DEUS_CC_OPT = '-O0';
      try {
        expect(deus('build', 'Cli.main', '-o', native, '--c', ...c).code).toBe(0);
      } finally {
        if (level === undefined) {
          delete process.env.DEUS_CC_OPT;
        } else {
          process.env.DEUS_CC_OPT = level;
        }
      }
      const target = ['--codebase', join(scratch, 'cli-target')];
      const run = (...args: string[]) =>
        spawnSync(native, args, { encoding: 'utf8', env: { ...process.env, DEUS_HOME: root } });
      expect(run('init', '--empty', ...target).status).toBe(0);
      const added = run(
        'add',
        join(root, 'examples/structural.deus'),
        join(root, 'deus/builtins.deus'),
        join(root, 'deus/prelude.deus'),
        ...target,
      );
      expect(added.status).toBe(0);
      expect(deusNode('view', 'Structural.structural', ...target).stdout).toBe(
        run('view', 'Structural.structural', ...target).stdout,
      );
      // The interpreter in the C runtime (D146) runs what the kernels run: tests, and expressions printed by their types.
      expect(run('test', ...target).stdout).toBe('  ✓ Structural.structuralSmall\n1 passed, 0 failed\n');
      for (const source of ['1 + 1', '[1 == 1, false]', 'Option.some ((), "a")', 'Structural.structural']) {
        expect(run('eval', source, ...target).stdout).toBe(deusNode('eval', source, ...target).stdout);
      }
      // The interpreter counts its own steps, so a perf block can run natively; only the order is comparable.
      const cost = run('eval', 'Code.cost (fun _ => List.length [1, 2, 3])', ...target);
      expect(cost.status).toBe(0);
      expect(Number(cost.stdout)).toBeGreaterThan(0);
      verdict.record();
    },
  );
});
