//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type { Quad } from '@rdfjs/types';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Store from './Store.ts';
import * as TypeBinding from './TypeBinding.ts';

/**
 * The units that write conclusions. Each owns one derived graph, replaced wholesale when it runs;
 * each sees the file graphs and the graphs of reasoners ordered before it, never its own previous
 * output. Filename order is the only dependency mechanism.
 *
 * Two kinds: N3 rule files, and JS passes (`derive`) for conclusions that need a computation rather
 * than a join — the cross-file type binding (`TypeBinding.ts`) is the first. A pass reads only the
 * file graphs and runs before every rule file, so each rule file sees every pass's graph.
 */

export class ReasonerError extends Data.TaggedError('code-index/ReasonerError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type RuleFile = {
  /** Names the derived graph; taken from the filename, so ordering is visible in the directory. */
  readonly name: string;
  readonly rules: string;
};

export type Pass = {
  readonly name: string;
  /** Reads the file graphs and returns its conclusions; `run` replaces its graph with them. */
  readonly derive: (store: Store.Api) => Effect.Effect<Quad[], Store.StoreError>;
};

export type Reasoner = RuleFile | Pass;

export type Outcome = Store.ReasonOutcome;

const PASSES_KEY = 'passes';

/** JS passes shipped with the tool. */
const BUILTIN: readonly Pass[] = [{ name: TypeBinding.NAME, derive: TypeBinding.derive }];

/** The rule files shipped with the tool. */
export const BUNDLED_DIR = fileURLToPath(new URL('../rules', import.meta.url));

/** The built-in passes, then every `.n3` file in `dir` in filename order. */
export const load = (dir: string): Effect.Effect<Reasoner[], ReasonerError> =>
  Effect.tryPromise({
    catch: (cause) => new ReasonerError({ message: `Cannot read rules from ${dir}`, cause }),
    try: async () => {
      const names = (await readdir(dir)).filter((name) => extname(name) === '.n3').sort();
      const rules: RuleFile[] = await Promise.all(
        names.map(async (name) => ({
          name: basename(name, '.n3'),
          rules: await readFile(join(dir, name), 'utf8'),
        })),
      );
      return [...BUILTIN, ...rules];
    },
  });

/** A single rules file, named after itself — for `--rules <file>`. */
export const loadFile = (path: string): Effect.Effect<RuleFile[], ReasonerError> =>
  Effect.tryPromise({
    catch: (cause) => new ReasonerError({ message: `Cannot read rules file: ${path}`, cause }),
    try: async () => [{ name: basename(path, extname(path)), rules: await readFile(path, 'utf8') }],
  });

/** Run each reasoner in order, replacing (or, natively, maintaining) its graph. Returns what each concluded. */
export const run = (reasoners: readonly Reasoner[]): Effect.Effect<Outcome[], Store.StoreError, Store.Store> =>
  Effect.gen(function* () {
    const store = yield* Store.Store;
    const outcomes: Outcome[] = [];
    for (const reasoner of reasoners) {
      if (!('derive' in reasoner)) {
        continue;
      }
      const started = Date.now();
      const derived = yield* reasoner.derive(store);
      yield* store.writePass(reasoner.name, derived);
      outcomes.push({
        name: reasoner.name,
        derived: derived.length,
        durationMs: Date.now() - started,
        incremental: false,
      });
    }
    // A pass that ran before but not now must leave no premise behind; the meta row names them.
    const ran = outcomes.map((outcome) => outcome.name);
    const previous = ((yield* store.getMeta(PASSES_KEY)) ?? '').split('\n').filter((name) => name.length > 0);
    for (const stale of previous.filter((name) => !ran.includes(name))) {
      yield* store.writePass(stale, []);
    }
    yield* store.setMeta(PASSES_KEY, ran.join('\n'));
    const rules = reasoners.filter((reasoner): reasoner is RuleFile => 'rules' in reasoner);
    return [...outcomes, ...(yield* store.reasonAll(rules))];
  });
