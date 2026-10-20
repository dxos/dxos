//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { type TestContext } from 'vitest';

const root = join(import.meta.dirname, '..');

/** Every file under `path` (or `path` itself), sorted, so the hash does not depend on directory order. */
const filesUnder = (path: string): string[] =>
  statSync(path).isDirectory()
    ? readdirSync(path)
        .sort()
        .flatMap((name) => filesUnder(join(path, name)))
    : [path];

/**
 * A pass kept by the hash of everything a whole-toolchain test reads, as `deus test` keeps a DEUS test's verdict
 * (D333): `held` is true when the same inputs passed before, so the test need not run again. The test's own file is
 * always an input, so editing a test runs it. CI keeps nothing and `DEUS_TEST_FRESH=1` ignores what is kept, so both
 * always run the test. `also` is anything else the result depends on, such as the C compiler's version.
 */
export const keptVerdict = (testFile: string, name: string, inputs: string[], also = '') => {
  const hash = createHash('sha256').update(`${name}\n${also}\n`);
  for (const file of [testFile, ...inputs].flatMap(filesUnder)) {
    hash.update(`${relative(root, file)}\n`).update(readFileSync(file));
  }
  const dir = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'deus/vitest');
  const slug = name.replace(/[^A-Za-z0-9]+/g, '-').slice(0, 60);
  const path = join(dir, `${slug}-${hash.digest('hex')}`);
  const keeping = !process.env.CI && process.env.DEUS_TEST_FRESH !== '1';
  return {
    held: keeping && existsSync(path),
    /** Records the pass; call it after the test's last expectation. */
    record: () => {
      if (keeping) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(path, `${new Date().toISOString()}\n`);
      }
    },
  };
};

/**
 * Wraps a test body so it skips while its inputs are as they were when it passed, and records a pass when it ends
 * without a failed expectation; the test's name keys the verdict.
 */
export const keptTest =
  (testFile: string, inputs: string[], also = '') =>
  (body: (context: TestContext) => unknown) =>
  async (context: TestContext) => {
    const verdict = keptVerdict(testFile, context.task.name, inputs, also);
    if (verdict.held) {
      context.skip('what it reads is as it was when it passed (D333)');
    }
    await body(context);
    verdict.record();
  };
