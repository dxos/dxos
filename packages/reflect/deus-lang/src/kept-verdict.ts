//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';

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
 * (D333): `held` is true when the same inputs passed before, so the test need not run again. CI keeps nothing and
 * `DEUS_TEST_FRESH=1` ignores what is kept, so both always run the test. `also` is anything else the result
 * depends on, such as the C compiler's version.
 */
export const keptVerdict = (name: string, inputs: string[], also = '') => {
  const hash = createHash('sha256').update(`${name}\n${also}\n`);
  for (const file of inputs.flatMap(filesUnder)) {
    hash.update(`${relative(root, file)}\n`).update(readFileSync(file));
  }
  const dir = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'deus/vitest');
  const path = join(dir, `${name}-${hash.digest('hex')}`);
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
