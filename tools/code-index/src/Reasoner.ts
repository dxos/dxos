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
 * Two kinds: N3 rule files, and JS reasoners (`derive`) for conclusions that need a computation
 * rather than a join — the cross-file type binding (`TypeBinding.ts`) is the first.
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

export type JsReasoner = {
  readonly name: string;
  /** Reads the store and returns its conclusions; `run` replaces its graph with them. */
  readonly derive: (store: Store.Api) => Effect.Effect<Quad[], Store.StoreError>;
};

export type Reasoner = RuleFile | JsReasoner;

export type Outcome = {
  readonly name: string;
  readonly derived: number;
  readonly durationMs: number;
};

/** JS reasoners shipped with the tool, ordered among the rule files by name. */
const BUILTIN: readonly Reasoner[] = [{ name: TypeBinding.NAME, derive: TypeBinding.derive }];

/** The rule files shipped with the tool. */
export const BUNDLED_DIR = fileURLToPath(new URL('../rules', import.meta.url));

/** Every `.n3` file in `dir`, in filename order. */
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
      // Built-in JS reasoners take their place in filename order, so a rule file can depend on them.
      return [...rules, ...BUILTIN].sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
      );
    },
  });

/** A single rules file, named after itself — for `--rules <file>`. */
export const loadFile = (path: string): Effect.Effect<RuleFile[], ReasonerError> =>
  Effect.tryPromise({
    catch: (cause) => new ReasonerError({ message: `Cannot read rules file: ${path}`, cause }),
    try: async () => [{ name: basename(path, extname(path)), rules: await readFile(path, 'utf8') }],
  });

/** Run each reasoner in order, replacing its graph. Returns what each concluded. */
export const run = (reasoners: readonly Reasoner[]): Effect.Effect<Outcome[], Store.StoreError, Store.Store> =>
  Effect.gen(function* () {
    const store = yield* Store.Store;
    const outcomes: Outcome[] = [];
    for (const reasoner of reasoners) {
      const started = Date.now();
      const derived =
        'rules' in reasoner
          ? yield* store.reason(reasoner.name, reasoner.rules, { materialize: true })
          : yield* reasoner.derive(store);
      if (!('rules' in reasoner)) {
        yield* store.materialize(reasoner.name, derived);
      }
      outcomes.push({ name: reasoner.name, derived: derived.length, durationMs: Date.now() - started });
    }
    return outcomes;
  });
