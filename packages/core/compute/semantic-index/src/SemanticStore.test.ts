//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SemanticStore } from './SemanticStore';
import { type Fact } from './types';

const mk = (over: Partial<Fact> & Pick<Fact, 'id'>): Fact => ({
  assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'paris' } },
  valence: { factuality: 'PR+', polarity: '+', confidence: 0.6 },
  attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
  ...over,
});

const TestLayer = SemanticStore.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

describe('SemanticStore', () => {
  it.effect(
    'stores and queries the Alice fact by subject entity',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.putFacts([mk({ id: 'f1' })]);
      const facts = yield* store.query({ subjectEntity: 'alice' });
      yield* Effect.sync(() => {
        if (facts.length !== 1 || facts[0].assertion.predicate !== 'travelsTo') {
          throw new Error('query failed');
        }
        if (facts[0].valence.factuality !== 'PR+') {
          throw new Error('valence lost');
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'keeps conflicting facts about the same subject/predicate',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.putFacts([
        mk({ id: 'f1' }),
        mk({
          id: 'f2',
          assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'rome' } },
          attribution: { agent: 'bob', source: 'dxn:q:m2', generatedAtTime: '2026-06-07T00:00:00.000Z' },
        }),
      ]);
      const facts = yield* store.query({ subjectEntity: 'alice', predicate: 'travelsTo' });
      yield* Effect.sync(() => {
        if (facts.length !== 2) {
          throw new Error(`expected 2 conflicting facts, got ${facts.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'query with no filters returns all facts',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.putFacts([mk({ id: 'f1' })]);
      const facts = yield* store.query({});
      yield* Effect.sync(() => {
        if (facts.length !== 1) {
          throw new Error(`expected 1 fact, got ${facts.length}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'cursor round-trips',
    Effect.fnUntraced(function* () {
      const store = yield* SemanticStore;
      yield* store.setCursor('dxn:q:m1', 'hashA');
      const a = yield* store.cursor('dxn:q:m1');
      yield* store.setCursor('dxn:q:m1', 'hashB');
      const b = yield* store.cursor('dxn:q:m1');
      yield* Effect.sync(() => {
        if (a !== 'hashA' || b !== 'hashB') {
          throw new Error(`cursor wrong: ${a}/${b}`);
        }
      });
    }, Effect.provide(TestLayer)),
  );
});
