//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import * as FactAnalyticsLive from '../store/analytics.ts';
import * as FactStoreLive from '../store/fact-store-live.ts';
import { termValue } from '../types/index.ts';
import { DEMO_CORPUS, generateCorpus } from './corpus.ts';

describe('generateCorpus', () => {
  it('is deterministic for a seed, and different across seeds', () => {
    expect(generateCorpus({ messages: 40, seed: 7 })).toEqual(generateCorpus({ messages: 40, seed: 7 }));
    expect(generateCorpus({ messages: 40, seed: 7 })).not.toEqual(generateCorpus({ messages: 40, seed: 8 }));
  });

  it('is inbox-shaped: many facts over many sources, long-tailed and uneven', () => {
    const facts = generateCorpus({ messages: 400 });
    // Several facts per message, so the corpus is an order of magnitude past what a list can show at once.
    expect(facts.length).toBeGreaterThan(800);
    expect(new Set(facts.map((fact) => fact.attribution.source)).size).toBeGreaterThan(350);
    const entities = new Set(
      facts.flatMap((fact) =>
        [fact.assertion.subject, fact.assertion.object].flatMap((term) =>
          term.kind === 'entity' ? [term.entity] : [],
        ),
      ),
    );
    expect(entities.size).toBeGreaterThan(30);
    // Enough distinct predicates that the overview has something to rank.
    expect(new Set(facts.map((fact) => fact.assertion.predicate)).size).toBeGreaterThan(10);
    // A mix of stances, not all plain assertions, and at least one question.
    expect(new Set(facts.map((fact) => fact.factuality.value)).size).toBeGreaterThan(3);
    expect(facts.some((fact) => fact.illocution?.mood === 'interrogative')).toBe(true);
    // No fact relates a thing to itself.
    expect(
      facts.filter(
        (fact) =>
          fact.assertion.object.kind === 'entity' &&
          termValue(fact.assertion.subject) === termValue(fact.assertion.object),
      ),
    ).toEqual([]);
  });

  it('carries contradicting claims about the same subject and predicate', () => {
    const facts = DEMO_CORPUS.filter((fact) => fact.id.startsWith('x-'));
    const alice = facts.filter((fact) => termValue(fact.assertion.subject) === 'alice-chen');
    expect(alice.length).toBe(2);
    expect(new Set(alice.map((fact) => fact.assertion.predicate)).size).toBe(1);
    // Different objects, different senders, different days — all three are what makes it a conflict.
    expect(new Set(alice.map((fact) => termValue(fact.assertion.object))).size).toBe(2);
    expect(new Set(alice.map((fact) => fact.attribution.agent)).size).toBe(2);
  });

  it.effect(
    'aggregates through a real store, so the overview a story shows is the overview the app shows',
    Effect.fnUntraced(function* () {
      const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
        Effect.sync(() => open.close()),
      ).pipe(Effect.orDie);
      const store = yield* FactStoreLive.make(database);
      const corpus = generateCorpus({ messages: 120, seed: 3 });
      yield* store.putFacts(corpus);

      const analytics = FactAnalyticsLive.fromStore(store);
      const memory = FactAnalyticsLive.fromFacts(corpus);

      expect(yield* analytics.count()).toBe(corpus.length);
      expect(yield* memory.count()).toBe(corpus.length);

      // The capped read is a window: the list is bounded while the total is not.
      const capped = yield* analytics.facts({ limit: 50 });
      expect(capped.length).toBe(50);
      expect(yield* analytics.count({})).toBe(corpus.length);

      // Both backends rank the entities the same way, which is what lets a story stand in for the app.
      const shape = (groups: ReadonlyArray<{ keys: readonly string[]; count: number }>) =>
        groups.map((group) => `${group.keys.join('|')}=${group.count}`);
      expect(shape(yield* analytics.aggregate({ by: ['entity'], limit: 10 }))).toEqual(
        shape(yield* memory.aggregate({ by: ['entity'], limit: 10 })),
      );
      // A predicate aggregate collapses the wordings: `works at`, `employed by` and `is on the team` are fewer
      // groups than surface forms.
      const predicates = yield* analytics.aggregate({ by: ['predicate'] });
      expect(predicates.length).toBeLessThan(new Set(corpus.map((fact) => fact.assertion.predicate)).size);
    }, Effect.scoped),
  );
});
