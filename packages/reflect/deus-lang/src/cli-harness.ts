//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

import { nativeFor, seedHash } from '../scripts/native.mjs';
import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

/**
 * The CLI with a scratch directory removed after the file's tests, shared by the CLI test files so the slow ones can
 * live in files of their own and run in parallel. It runs the native build of this seed when one is cached (D171),
 * 10 to 100 times faster, else the seed in-process; `DEUS_TEST_KERNEL=node` forces the seed, and CI never has a
 * native build, so it always tests the seed itself.
 */
export const cliHarness = (prefix: string) => {
  const root = join(import.meta.dirname, '..');
  const seed = readFileSync(SEED_PATH, 'utf8');
  const scratch = mkdtempSync(join(tmpdir(), prefix));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  /** Writes a source file into the scratch directory and returns its path. */
  const file = (name: string, text: string) => {
    const path = join(scratch, name);
    writeFileSync(path, text);
    return path;
  };

  const native = process.env.DEUS_TEST_KERNEL === 'node' ? undefined : nativeFor(process.env).binary;
  const imageHash = seedHash();

  /** Runs the seed in-process on the reference kernel (node), whatever `deus` runs. */
  const deusNode = (...args: string[]) => {
    let stdout = '';
    let stderr = '';
    const { code } = runImage(seed, {
      args,
      stdout: (chunk) => {
        stdout += chunk;
      },
      stderr: (chunk) => {
        stderr += chunk;
      },
    });
    return { code, stdout, stderr };
  };

  /** Runs the DEUS CLI: the native build of the seed when there is one, else the seed in-process. */
  const deus = (...args: string[]) => {
    if (native) {
      const run = spawnSync(native, args, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 1024,
        // As bin/deus.mjs runs it: a failing test is confirmed on node, and theorem verdicts name the image.
        env: {
          DEUS_HOME: root,
          ...process.env,
          DEUS_KERNEL: 'native',
          DEUS_IMAGE_HASH: process.env.DEUS_IMAGE_HASH ?? imageHash,
        },
      });
      return { code: run.status ?? 1, stdout: run.stdout, stderr: run.stderr };
    }
    return deusNode(...args);
  };

  return { root, seed, scratch, file, deus, deusNode };
};
