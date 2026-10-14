//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

const root = join(import.meta.dirname, '..');

describe('seed', () => {
  // The compiler is written in DEUS; the seed is its compiled image. Compiling the sources with
  // the seed must reproduce the seed byte for byte, or the checked-in seed is stale.
  test('compiles the compiler to itself (self-hosting fixpoint)', ({ expect }) => {
    const seed = readFileSync(SEED_PATH, 'utf8');
    let out = '';
    let err = '';
    const cwd = process.cwd();
    process.chdir(root);
    try {
      const { code } = runImage(seed, {
        args: ['compile', 'deus', '--main', 'Cli.main'],
        stdout: (chunk) => {
          out += chunk;
        },
        stderr: (chunk) => {
          err += chunk;
        },
      });
      expect(err).toBe('');
      expect(code).toBe(0);
    } finally {
      process.chdir(cwd);
    }
    expect(out === seed).toBe(true);
  });
});
