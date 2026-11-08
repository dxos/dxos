//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as SqlStorage from '@dxos/sql-sqlite/SqlStorage';

import { type FactAggregate } from '../internal/sparql/aggregate.ts';
import { type Fact } from '../types/index.ts';
import * as FactAnalyticsLive from './analytics.ts';
import * as FactStoreLive from './fact-store-live.ts';

const fact = (id: string, over: Partial<Fact> = {}): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: 'alice', label: 'Alice' },
    predicate: 'travels to',
    object: { kind: 'entity', entity: 'paris', label: 'Paris' },
  },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
  attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T00:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: id,
  ...over,
});

const assertion = (subject: string, predicate: string, object: string) => ({
  subject: { kind: 'entity' as const, entity: subject },
  predicate,
  object: { kind: 'entity' as const, entity: object },
});

/**
 * A corpus whose counts differ per dimension, so a wrong grouping cannot pass by coincidence: alice is in four
 * facts, `works at` is used twice, two sources, one uncertain fact and one question.
 */
const CORPUS: Fact[] = [
  fact('f1'),
  fact('f2', { assertion: assertion('alice', 'works at', 'dxos') }),
  fact('f3', { assertion: assertion('bob', 'works at', 'dxos') }),
  fact('f4', {
    assertion: assertion('alice', 'met', 'bob'),
    factuality: { value: 'PR+', polarity: '+', confidence: 0.4 },
    attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
  }),
  fact('f5', {
    assertion: assertion('alice', 'travels to', 'rome'),
    illocution: { force: 'directive', mood: 'interrogative' },
    attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
  }),
];

/** Groups as `key[|key] = count`, sorted, so two backends compare without depending on tie order. */
const shape = (groups: ReadonlyArray<{ keys: readonly string[]; count: number }>): string[] =>
  groups.map((group) => `${group.keys.join('|')}=${group.count}`).sort();

/** Both analytics backends over the same corpus: the store (SPARQL/SQLite) and the plain fact array (JS). */
const backends = Effect.gen(function* () {
  const database = yield* Effect.acquireRelease(SqlStorage.makeMemory(), (open) =>
    Effect.sync(() => open.close()),
  ).pipe(Effect.orDie);
  const store = yield* FactStoreLive.make(database);
  yield* store.putFacts(CORPUS);
  return { store: FactAnalyticsLive.fromStore(store), memory: FactAnalyticsLive.fromFacts(CORPUS) };
});

/** Predicate IRIs are the store's group keys; the local name is enough to assert on. */
const localNames = (groups: ReadonlyArray<{ keys: readonly string[]; count: number }>): string[] =>
  shape(
    groups.map((group) => ({
      ...group,
      keys: group.keys.map((key) => key.replace(/^.*[/#]/, '')),
    })),
  );

describe('FactAnalytics', () => {
  it.effect(
    'counts a scoped read exactly, where a capped read is a window on it',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      for (const analytics of [store, memory]) {
        expect(yield* analytics.count()).toBe(5);
        expect(yield* analytics.count({ entity: 'alice' })).toBe(4);
        expect(yield* analytics.count({ subjectEntity: 'bob' })).toBe(1);
        expect(yield* analytics.count({ source: 'dxn:q:m2' })).toBe(2);
        expect(yield* analytics.count({ minConfidence: 0.5 })).toBe(4);
        // The cap bounds the list without changing the total it is a window on.
        expect((yield* analytics.facts({ limit: 2 })).length).toBe(2);
        expect(yield* analytics.count({})).toBe(5);
      }
    }, Effect.scoped),
  );

  it.effect(
    'groups by one dimension identically in SQL and in JS',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      const cases: FactAggregate[] = [
        { by: ['entity'] },
        { by: ['subject'] },
        { by: ['object'] },
        { by: ['source'] },
        { by: ['agent'] },
        { by: ['factuality'] },
        { by: ['force'] },
      ];
      for (const aggregate of cases) {
        expect(localNames(yield* store.aggregate(aggregate))).toEqual(localNames(yield* memory.aggregate(aggregate)));
      }
      expect(shape(yield* store.aggregate({ by: ['entity'] }))).toEqual([
        'alice=4',
        'bob=2',
        'dxos=2',
        'paris=1',
        'rome=1',
      ]);
      expect(shape(yield* store.aggregate({ by: ['factuality'] }))).toEqual(['CT+=4', 'PR+=1']);
      // Absent `illocution` reads as `assertive`, so the question is the only directive.
      expect(shape(yield* store.aggregate({ by: ['force'] }))).toEqual(['assertive=4', 'directive=1']);
      expect(shape(yield* store.aggregate({ by: ['source'] }))).toEqual(['dxn:q:m1=3', 'dxn:q:m2=2']);
    }, Effect.scoped),
  );

  it.effect(
    'groups by predicate, as the IRI the ontology resolves it to',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      expect(localNames(yield* store.aggregate({ by: ['predicate'] }))).toEqual(
        localNames(yield* memory.aggregate({ by: ['predicate'] })),
      );
      // `works at` is the seed vocabulary's `schema:worksFor`; both uses land on the one predicate.
      expect(localNames(yield* store.aggregate({ by: ['predicate'] }))).toContain('worksFor=2');
    }, Effect.scoped),
  );

  it.effect(
    'cross-tabs two dimensions and honours the scope and the limit',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      const crosstab: FactAggregate = { by: ['entity', 'factuality'] };
      expect(localNames(yield* store.aggregate(crosstab))).toEqual(localNames(yield* memory.aggregate(crosstab)));
      expect(shape(yield* store.aggregate(crosstab))).toEqual([
        'alice|CT+=3',
        'alice|PR+=1',
        'bob|CT+=1',
        'bob|PR+=1',
        'dxos|CT+=2',
        'paris|CT+=1',
        'rome|CT+=1',
      ]);
      // Scoped to one source, and capped to the busiest group.
      expect(shape(yield* store.aggregate({ by: ['entity'], scope: { source: 'dxn:q:m2' }, limit: 1 }))).toEqual([
        'alice=2',
      ]);
      expect(yield* memory.aggregate({ by: ['entity'], scope: { source: 'dxn:q:m2' }, limit: 1 })).toEqual(
        yield* store.aggregate({ by: ['entity'], scope: { source: 'dxn:q:m2' }, limit: 1 }),
      );
    }, Effect.scoped),
  );

  it.effect(
    'reads an entity label back from the graph that states it',
    Effect.fnUntraced(function* () {
      const { store, memory } = yield* backends;
      for (const analytics of [store, memory]) {
        const labels = yield* analytics.entityLabels(['alice', 'paris', 'dxos']);
        expect(labels.get('alice')).toBe('Alice');
        expect(labels.get('paris')).toBe('Paris');
        // `dxos` is only ever mentioned without a label, so it has none to show.
        expect(labels.has('dxos')).toBe(false);
        expect(yield* analytics.entityLabels([])).toEqual(new Map());
      }
    }, Effect.scoped),
  );
});
