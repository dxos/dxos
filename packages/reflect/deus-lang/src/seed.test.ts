//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { keptVerdict } from './kept-verdict.ts';
import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

const root = join(import.meta.dirname, '..');

const compileWithSeed = (sources: string) => {
  const seed = readFileSync(SEED_PATH, 'utf8');
  let out = '';
  let err = '';
  let code = 1;
  const cwd = process.cwd();
  process.chdir(root);
  try {
    ({ code } = runImage(seed, {
      args: ['compile', sources, '--main', 'Cli.main'],
      stdout: (chunk) => {
        out += chunk;
      },
      stderr: (chunk) => {
        err += chunk;
      },
    }));
  } finally {
    process.chdir(cwd);
  }
  return { seed, out, err, code };
};

describe('seed', () => {
  // The compiler is written in DEUS; the seed is its compiled image. Compiling the sources with
  // the seed must reproduce the seed byte for byte, or the checked-in seed is stale.
  test('compiles the compiler to itself (self-hosting fixpoint)', { timeout: 180_000 }, ({ expect, skip }) => {
    const kept = keptVerdict(import.meta.filename, 'seed-fixpoint', [
      SEED_PATH,
      join(root, 'deus'),
      join(root, 'src/kernel'),
    ]);
    if (kept.held) {
      skip('the seed, deus/ and the kernel are as they were when this passed');
    }
    const { seed, out, err, code } = compileWithSeed('deus');
    expect(err).toBe('');
    expect(code).toBe(0);
    expect(out === seed).toBe(true);
    kept.record();
  });
});
