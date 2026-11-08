//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import * as FactAnalyticsLive from '../store/analytics.ts';
import * as FactStoreLive from '../store/fact-store-live.ts';
import { Mapping, termValue } from '../types/index.ts';
import { DEMO_CORPUS, beliefDemo, generateCorpus } from './corpus.ts';

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

describe('beliefDemo', () => {
  it('plants a stale claim in the corpus and keeps the correction out of it', () => {
    const demo = beliefDemo({ messages: 60 });
    expect(demo.prior).toContain(demo.stale);
    // The correction is the demo's third beat; a store seeded with `prior` has never seen it.
    expect(demo.prior).not.toContain(demo.correction);
    expect(demo.correction.supersedes).toEqual([Mapping.graphOf(demo.stale)]);
  });

  it('makes the two claims differ on every axis the store records', () => {
    const { stale, correction } = beliefDemo({ messages: 60 });
    expect(termValue(stale.assertion.object)).not.toBe(termValue(correction.assertion.object));
    expect(stale.attribution.agent).not.toBe(correction.attribution.agent);
    expect(stale.attribution.source).not.toBe(correction.attribution.source);
    expect(stale.factuality.value).toBe('PR+');
    expect(correction.factuality.value).toBe('CT+');
    expect(Date.parse(correction.attribution.generatedAtTime)).toBeGreaterThan(
      Date.parse(stale.attribution.generatedAtTime),
    );
    // Same subject and predicate, so they are answers to one question rather than two unrelated facts.
    expect(termValue(stale.assertion.subject)).toBe(termValue(correction.assertion.subject));
    expect(stale.assertion.predicate).toBe(correction.assertion.predicate);
  });

  it.effect(
    'answers the question differently once the correction is stored',
    Effect.fnUntraced(function* () {
      const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
        Effect.sync(() => open.close()),
      ).pipe(Effect.orDie);
      const store = yield* FactStoreLive.make(database);
      const demo = beliefDemo({ messages: 60 });
      const analytics = FactAnalyticsLive.fromStore(store);
      const query = { subjectEntity: demo.subject, predicate: demo.predicate, current: true } as const;

      yield* store.putFacts(demo.prior);
      const before = yield* analytics.facts(query);
      expect(before.map((fact) => termValue(fact.assertion.object))).toContain('helios-capital');

      yield* store.putFacts([demo.correction]);
      const after = yield* analytics.facts(query);
      expect(after.map((fact) => termValue(fact.assertion.object))).toContain('dxos');
      expect(after.map((fact) => termValue(fact.assertion.object))).not.toContain('helios-capital');

      // The stale claim is still there, with its author and date — hidden from the answer, not deleted.
      const history = yield* analytics.facts({ subjectEntity: demo.subject, predicate: demo.predicate });
      const stale = history.find((fact) => termValue(fact.assertion.object) === 'helios-capital');
      expect(stale?.attribution.agentLabel).toBe('Alice Chen');
      expect(stale?.attribution.generatedAtTime).toBe('2026-05-30T09:00:00.000Z');
    }, Effect.scoped),
  );
});

describe('beliefDemo scripting', () => {
  it('leaves the subject exactly one claim, so the correction is the thing that changes the answer', () => {
    const demo = beliefDemo({ messages: 400 });
    const about = demo.prior.filter((fact) => termValue(fact.assertion.subject) === demo.subject);
    expect(about).toEqual([demo.stale]);
    // The generator's other 1,000-odd facts are still there: the store is realistic, the question is scripted.
    expect(demo.prior.length).toBeGreaterThan(800);
    // And the subject is still mentioned by others, so they are part of the corpus rather than removed from it.
    expect(
      demo.prior.some(
        (fact) => fact.assertion.object.kind === 'entity' && termValue(fact.assertion.object) === demo.subject,
      ),
    ).toBe(true);
  });

  it.effect(
    'answers Helios before the correction and DXOS after it',
    Effect.fnUntraced(function* () {
      const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
        Effect.sync(() => open.close()),
      ).pipe(Effect.orDie);
      const store = yield* FactStoreLive.make(database);
      const demo = beliefDemo({ messages: 120 });
      const analytics = FactAnalyticsLive.fromStore(store);
      const query = { subjectEntity: demo.subject, predicate: demo.predicate, current: true } as const;

      yield* store.putFacts(demo.prior);
      const before = yield* analytics.facts(query);
      expect(before.map((fact) => termValue(fact.assertion.object))).toEqual(['helios-capital']);

      yield* store.putFacts([demo.correction]);
      const after = yield* analytics.facts(query);
      expect(after.map((fact) => termValue(fact.assertion.object))).toEqual(['dxos']);
    }, Effect.scoped),
  );
});
