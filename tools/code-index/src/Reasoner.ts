//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Store from './Store.ts';

/**
 * The units that write conclusions. Each owns one derived graph, replaced wholesale when it runs;
 * each sees the file graphs and the graphs of reasoners ordered before it, never its own previous
 * output. Filename order is the only dependency mechanism.
 *
 * Only N3 rule files are implemented. The JS form (`Reasoner.make({ name, run })`, for conclusions
 * that need a walk or a computation rather than a join) is designed in `design/ONTOLOGY.md` and not
 * yet built.
 */

export class ReasonerError extends Data.TaggedError('code-index/ReasonerError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type Reasoner = {
  /** Names the derived graph; taken from the filename, so ordering is visible in the directory. */
  readonly name: string;
  readonly rules: string;
};

export type Outcome = Store.ReasonOutcome;

/** The rule files shipped with the tool. */
export const BUNDLED_DIR = fileURLToPath(new URL('../rules', import.meta.url));

/** Every `.n3` file in `dir`, in filename order. */
export const load = (dir: string): Effect.Effect<Reasoner[], ReasonerError> =>
  Effect.tryPromise({
    catch: (cause) => new ReasonerError({ message: `Cannot read rules from ${dir}`, cause }),
    try: async () => {
      const names = (await readdir(dir)).filter((name) => extname(name) === '.n3').sort();
      return Promise.all(
        names.map(async (name) => ({
          name: basename(name, '.n3'),
          rules: await readFile(join(dir, name), 'utf8'),
        })),
      );
    },
  });

/** A single rules file, named after itself — for `--rules <file>`. */
export const loadFile = (path: string): Effect.Effect<Reasoner[], ReasonerError> =>
  Effect.tryPromise({
    catch: (cause) => new ReasonerError({ message: `Cannot read rules file: ${path}`, cause }),
    try: async () => [{ name: basename(path, extname(path)), rules: await readFile(path, 'utf8') }],
  });

/** Run each reasoner in order, replacing (or, natively, maintaining) its graph. Returns what each concluded. */
export const run = (reasoners: readonly Reasoner[]): Effect.Effect<Outcome[], Store.StoreError, Store.Store> =>
  Effect.flatMap(Store.Store, (store) => store.reasonAll(reasoners));
