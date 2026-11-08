//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { rewriteTopLevel } from './rewrite.ts';
import { type CaseRun, runCase } from './testing/compare.ts';
import CORPUS from './testing/corpus.json' with { type: 'json' };

EntityId.dangerouslyDisableRandomness();

/**
 * Programs models wrote for the Effect dialect, taken from memoized conversations, the dialect's docs
 * and tests, and the transcripts of DXOS spaces (scrubbed: ids replaced, private content dropped).
 *
 * Each runs alone through both sandboxes against the same seeded database. A live snippet was written
 * for a space whose types this database does not have, so most of those fail — what is under test is
 * that they fail, or succeed, the same way in both.
 */
type CorpusEntry = {
  readonly id: string;
  readonly origin: string;
  readonly code: string;
  readonly conversation?: string;
  readonly order?: string;
};

const corpus: readonly CorpusEntry[] = CORPUS;

/**
 * Where the two engines are allowed to word a failure differently: the error's own text comes from
 * V8 in one and djs in the other ("Cannot read properties of undefined (reading 'x')" against
 * "cannot read property 'x' of undefined"), so a failure compares by what was printed before it.
 */
const comparable = ({ results, database }: CaseRun) => ({
  database,
  results: results.map(({ ok, output }) => ({
    ok,
    output: ok ? output : output.slice(0, Math.max(0, output.lastIndexOf('\nError:'))),
  })),
});

/**
 * Programs whose output differs for a reason that is the engine's, not the bridge's; each still has to
 * succeed or fail as it does in-process.
 */
const ENGINE_DIVERGENCES: Readonly<Record<string, string>> = {
  // Prints a caught TypeError, whose text each engine words its own way.
  'live-7a0700cfe7': 'error text',
  // List a module namespace's keys: a bundled namespace orders them alphabetically, as the language
  // specifies, while vitest's module transform keeps declaration order.
  'live-0d5f27e210': 'namespace key order',
  'live-7f75584b52': 'namespace key order',
};

describe('corpus: every program behaves as it does in-process', () => {
  for (const entry of corpus) {
    it.effect(
      `${entry.origin} ${entry.id}`,
      Effect.fnUntraced(function* (_) {
        const compat = { name: entry.id, programs: [entry.code] };
        const djs = yield* runCase(compat, 'djs');
        const reference = yield* runCase(compat, 'in-process');
        if (entry.id in ENGINE_DIVERGENCES) {
          expect(djs.results.map(({ ok }) => ok)).toEqual(reference.results.map(({ ok }) => ok));
          expect(djs.database).toEqual(reference.database);
        } else {
          expect(comparable(djs)).toEqual(comparable(reference));
        }
      }, TestHelpers.provideTestContext),
    );
  }
});

/** A recorded conversation's programs, in order, as one djs session replays them. */
const conversations = Object.values(
  Object.groupBy(
    corpus.filter((entry) => entry.conversation !== undefined),
    (entry) => entry.conversation ?? '',
  ),
).flatMap((entries) => (entries && entries.length > 1 ? [entries] : []));

describe('corpus: a conversation reads what its earlier programs bound', () => {
  for (const entries of conversations) {
    const declared = new Set<string>();
    // The names a program uses that an earlier program of the conversation declared and it does not.
    const carried = entries.map((entry) => {
      const { names } = rewriteTopLevel(entry.code);
      const inherited = [...declared].filter(
        (name) => !names.includes(name) && new RegExp(`\\b${name}\\b`).test(entry.code),
      );
      names.forEach((name) => declared.add(name));
      return inherited;
    });
    if (carried.every((names) => names.length === 0)) {
      continue;
    }
    it.effect(
      `conversation ${entries[0].conversation} (${entries.length} programs)`,
      Effect.fnUntraced(function* (_) {
        const { results } = yield* runCase({ name: 'conversation', programs: entries.map(({ code }) => code) }, 'djs');
        results.forEach(({ output }, index) => {
          for (const name of carried[index]) {
            expect(output, `program ${index} reads ${name}`).not.toContain(`${name} is not defined`);
          }
        });
      }, TestHelpers.provideTestContext),
      { timeout: 120_000 },
    );
  }
});
