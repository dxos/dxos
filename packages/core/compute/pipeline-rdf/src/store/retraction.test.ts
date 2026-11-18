//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { type Fact, Graph, Mapping } from '../types/index.ts';
import * as FactAnalyticsLive from './analytics.ts';
import * as FactStoreLive from './fact-store-live.ts';

const fact = (id: string, object: string, over: Partial<Fact> = {}): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: 'hugo-marchand', label: 'Hugo Marchand' },
    predicate: 'works at',
    object: { kind: 'entity', entity: object, label: object },
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6 },
  attribution: { agent: 'alice-chen', source: 'dxn:gmail:msg-1', generatedAtTime: '2026-06-01T00:00:00.000Z' },
  recordedAt: '2026-06-01T00:00:00.000Z',
  extractor: { id: 'test', model: 'm', version: '1' },
  sourceHash: id,
  ...over,
});

/** The stale claim, and the correction that replaces it — a different sender, a later day, more certain. */
const STALE = fact('f-stale', 'helios-capital');
const CORRECTION = Graph.supersede(
  fact('f-correction', 'dxos', {
    factuality: { value: 'CT+', polarity: '+', confidence: 0.95 },
    attribution: { agent: 'bob-mehta', source: 'dxn:gmail:msg-2', generatedAtTime: '2026-06-09T00:00:00.000Z' },
  }),
  STALE,
);

/** An unrelated claim, so `current` is shown to drop only what was actually replaced. */
const OTHER = fact('f-other', 'castalia', {
  assertion: {
    subject: { kind: 'entity', entity: 'ida-sorensen', label: 'Ida Sorensen' },
    predicate: 'works at',
    object: { kind: 'entity', entity: 'castalia', label: 'Castalia' },
  },
});

const CORPUS = [STALE, CORRECTION, OTHER];

const objectsOf = (facts: readonly Fact[]) =>
  facts.map((found) => (found.assertion.object.kind === 'entity' ? found.assertion.object.entity : '')).sort();

const backends = Effect.gen(function* () {
  const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
    Effect.sync(() => open.close()),
  ).pipe(Effect.orDie);
  const store = yield* FactStoreLive.make(database);
  yield* store.putFacts(CORPUS);
  return { store: FactAnalyticsLive.fromStore(store), memory: FactAnalyticsLive.fromFacts(CORPUS) };
});

describe('supersede and retract', () => {
  test('links the correction to the graph of the claim it replaces', () => {
    expect(CORRECTION.supersedes).toEqual([Mapping.graphOf(STALE)]);
    // The builder does not touch the claim it replaces; nothing is deleted or rewritten.
    expect(STALE.supersedes).toBeUndefined();
  });

  test('marks the replaced claim superseded and leaves the rest active', () => {
    const statuses = Graph.status(CORPUS);
    expect(statuses.get(Mapping.graphOf(STALE))).toBe('superseded');
    expect(statuses.get(Mapping.graphOf(CORRECTION))).toBe('active');
    expect(statuses.get(Mapping.graphOf(OTHER))).toBe('active');
  });

  test('lets a retraction win over a supersession of the same claim', () => {
    const withdrawal = Graph.retract(fact('f-withdrawal', 'nothing'), STALE);
    expect(Graph.status([...CORPUS, withdrawal]).get(Mapping.graphOf(STALE))).toBe('retracted');
  });

  it.effect(
    'hides a superseded claim from a `current` read and keeps it in every other',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      for (const analytics of [store, memory]) {
        // The default read is the history: both claims, so a conflict is visible.
        expect(objectsOf(yield* analytics.facts({ entity: 'hugo-marchand' }))).toEqual(['dxos', 'helios-capital']);
        // The `current` read is the answer: the correction alone.
        expect(objectsOf(yield* analytics.facts({ entity: 'hugo-marchand', current: true }))).toEqual(['dxos']);
        // Nothing else is affected.
        expect(objectsOf(yield* analytics.facts({ entity: 'ida-sorensen', current: true }))).toEqual(['castalia']);
      }
    }, Effect.scoped),
  );

  it.effect(
    'counts and aggregates agree with the list they stand over',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      for (const analytics of [store, memory]) {
        expect(yield* analytics.count({})).toBe(3);
        expect(yield* analytics.count({ current: true })).toBe(2);
        expect(yield* analytics.count({ entity: 'hugo-marchand', current: true })).toBe(1);

        // `helios-capital` is mentioned only by the superseded claim, so it leaves the ranking with it.
        const keys = (groups: ReadonlyArray<{ keys: readonly string[] }>) => groups.map((group) => group.keys[0]);
        expect(keys(yield* analytics.aggregate({ by: ['entity'] }))).toContain('helios-capital');
        expect(keys(yield* analytics.aggregate({ by: ['entity'], scope: { current: true } }))).not.toContain(
          'helios-capital',
        );
      }
    }, Effect.scoped),
  );

  it.effect(
    'reports WHY a claim no longer stands, from the store rather than from the claims in scope',
    Effect.fnUntraced(function* () {
      const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
        Effect.sync(() => open.close()),
      ).pipe(Effect.orDie);
      const store = yield* FactStoreLive.make(database);
      // The withdrawal shares neither the subject nor the predicate of the claim it withdraws, so a status
      // derived from a read scoped to that claim would miss the link entirely.
      const withdrawal = Graph.retract(
        fact('f-withdrawal', 'nothing', {
          assertion: {
            subject: { kind: 'entity', entity: 'bob-mehta', label: 'Bob Mehta' },
            predicate: 'has note',
            object: { kind: 'literal', literal: 'withdrawn' },
          },
        }),
        STALE,
      );
      yield* store.putFacts([STALE, withdrawal]);

      for (const analytics of [FactAnalyticsLive.fromStore(store), FactAnalyticsLive.fromFacts([STALE, withdrawal])]) {
        const statuses = yield* analytics.statuses();
        expect(statuses.get(Mapping.graphOf(STALE))).toBe('retracted');
        // Scoped to the claim alone, the link is nowhere in the results — which is the whole point.
        const scoped = yield* analytics.facts({ subjectEntity: 'hugo-marchand', predicate: 'works at' });
        expect(scoped.map((found) => found.id)).toEqual(['f-stale']);
      }
    }, Effect.scoped),
  );

  it.effect(
    'a retraction leaves no standing answer, where a correction leaves one',
    Effect.fnUntraced(function* () {
      const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
        Effect.sync(() => open.close()),
      ).pipe(Effect.orDie);
      const store = yield* FactStoreLive.make(database);
      const withdrawal = Graph.retract(
        fact('f-withdrawal', 'nothing', {
          assertion: {
            subject: { kind: 'entity', entity: 'bob-mehta', label: 'Bob Mehta' },
            predicate: 'has note',
            object: { kind: 'literal', literal: 'withdrawn: the thread was stale' },
          },
        }),
        STALE,
      );
      yield* store.putFacts([STALE, withdrawal]);
      const analytics = FactAnalyticsLive.fromStore(store);
      expect(yield* analytics.facts({ entity: 'hugo-marchand', current: true })).toEqual([]);
      // Still there, with its author and date, which is what makes the withdrawal auditable.
      const history = yield* analytics.facts({ entity: 'hugo-marchand' });
      expect(history.length).toBe(1);
      expect(history[0]?.attribution.agent).toBe('alice-chen');
    }, Effect.scoped),
  );
});
