//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Fact } from '@dxos/echo-memory';
import { MemorySqlite } from '@dxos/echo-memory-sqlite';

import * as FactStoreMemory from './fact-store-memory.ts';
import { FactStore } from './fact-store.ts';

const fact = Fact.make({
  id: 'f1',
  assertion: {
    subject: { kind: 'entity', entity: 'alice' },
    predicate: 'works at',
    object: { kind: 'entity', entity: 'acme' },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T00:00:00.000Z',
  extractor: { id: 'test', model: 'none', version: '1' },
  sourceHash: 'h1',
});

describe('FactStoreMemory', () => {
  it.effect('a FactStore over a memory stores, queries, moves cursors and clears through it', () =>
    Effect.gen(function* () {
      const store = yield* FactStore;
      yield* store.putFacts([fact]);
      expect(yield* store.query({ subjectEntity: 'alice' })).toHaveLength(1);
      expect(yield* store.rows('SELECT ?g WHERE { GRAPH ?g { ?s ?p ?o } }')).not.toEqual([]);
      expect((yield* store.predicates()).length).toBeGreaterThan(0);

      yield* store.setCursor('dxn:q', 'h1');
      expect(yield* store.cursor('dxn:q')).toBe('h1');

      yield* store.clear();
      expect(yield* store.query({})).toEqual([]);
      expect(yield* store.cursor('dxn:q')).toBeUndefined();
    }).pipe(Effect.provide(FactStoreMemory.layer.pipe(Layer.provide(MemorySqlite.layerMemory)))),
  );
});
