//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

import { SEED_PATH } from './kernel/main.ts';
import { runImage } from './kernel/run.ts';

/**
 * The seed run in-process with a scratch directory removed after the file's tests, shared by the CLI
 * test files so the slow ones can live in files of their own and run in parallel.
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

  /** Runs the seed (the DEUS CLI) in-process. */
  const deus = (...args: string[]) => {
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

  return { root, seed, scratch, file, deus };
};
