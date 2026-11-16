//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { type Fact } from '../types/index.ts';
import * as FactStoreLive from './fact-store-live.ts';
import { type FactStoreApi } from './fact-store.ts';

const fact = (id: string, subject: string, predicate: string, object: string, source = 'dxn:q:m1'): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: subject, label: subject },
    predicate,
    object: { kind: 'entity', entity: object },
    quote: `${subject} ${predicate} ${object}`,
  },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.8 },
  attribution: { agent: subject, source, generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: id,
});

const FACTS = [
  fact('f1', 'alice', 'travelsTo', 'paris'),
  fact('f2', 'bob', 'works on', 'indexer', 'dxn:q:m2'),
  fact('f3', 'alice', 'works on', 'composer', 'dxn:q:m2'),
];

const ids = (facts: readonly Fact[]) => facts.map(({ id }) => id).sort();

/** Everything the store answers about FACTS, so two stores can be compared whole. */
const snapshot = (store: FactStoreApi) =>
  Effect.gen(function* () {
    return {
      all: ids(yield* store.query({})),
      alice: ids(yield* store.query({ subjectEntity: 'alice' })),
      worksOn: ids(yield* store.query({ predicate: 'works on' })),
      fromM2: ids(yield* store.query({ source: 'dxn:q:m2' })),
      selected: ids(yield* store.select('SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } }')),
      rows: (yield* store.rows('SELECT (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }'))[0]?.n?.value,
      predicates: (yield* store.predicates()).map(({ iri }) => iri).sort(),
      cursor: yield* store.cursor('dxn:q:m2'),
    };
  });

const fill = (store: FactStoreApi) =>
  Effect.gen(function* () {
    yield* store.putFacts(FACTS);
    yield* store.setCursor('dxn:q:m2', 'h2');
  });

describe('FactStoreLive.makeAsync', () => {
  it.effect('answers every operation as the sync store does', () =>
    Effect.gen(function* () {
      const sync = FactStoreLive.makeMemory();
      yield* fill(sync);
      const async = yield* FactStoreLive.makeAsync();
      yield* fill(async);

      const expected = yield* snapshot(sync);
      expect(expected.all).toEqual(['f1', 'f2', 'f3']);
      expect(yield* snapshot(async)).toEqual(expected);

      yield* sync.clear();
      yield* async.clear();
      expect(yield* snapshot(async)).toEqual(yield* snapshot(sync));
    }).pipe(Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );

  it.effect('a failing query fails with the store error', () =>
    Effect.gen(function* () {
      const store = yield* FactStoreLive.makeAsync();
      const error = yield* Effect.flip(store.rows('INSERT DATA { <a:s> <a:p> <a:o> }'));
      expect(error.name).toBe('SemanticIndexError');
    }).pipe(Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
  );
});
