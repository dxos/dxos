//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { FactStoreLive, type RDF } from '@dxos/pipeline-rdf';

import {
  idsEntitySource,
  memoryEntitySource,
  memoryFactSource,
  storeEntitySource,
  storeFactSource,
} from './sources.ts';
import { toEntityCards } from './subgraph.ts';

const fact = (id: string, subject: string, predicate: string, object: string): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: subject, label: subject.toUpperCase(), type: 'person' },
    predicate,
    object: { kind: 'entity', entity: object, label: object.toUpperCase(), type: 'org' },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: `dxn:q:${id}`, generatedAtTime: '2026-11-16T00:00:00.000Z' },
  recordedAt: '2026-11-16T00:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: id,
});

const FACTS = [
  fact('f1', 'alice', 'works at', 'acme'),
  fact('f2', 'bob', 'works at', 'acme'),
  fact('f3', 'carol', 'works at', 'globex'),
];

describe('sources', () => {
  it.effect(
    'memory and store entity sources answer the same windows',
    Effect.fnUntraced(function* () {
      const store = FactStoreLive.makeMemory();
      yield* store.putFacts(FACTS);
      const memory = memoryEntitySource(
        toEntityCards(FACTS, { objects: true }).sort((left, right) => left.label.localeCompare(right.label)),
      );
      const remote = storeEntitySource(store);

      for (const source of [memory, remote]) {
        const window = yield* source.window({ offset: 1, limit: 2 });
        expect(window.total).toBe(5);
        expect(window.items.map((item) => item.id)).toEqual(['alice', 'bob']);
        expect(window.types).toEqual([
          { type: 'Person', count: 3 },
          { type: 'Organization', count: 2 },
        ]);
        const orgs = yield* source.window({ offset: 0, limit: 10, type: 'Organization' });
        expect(orgs.items.map((item) => item.id)).toEqual(['acme', 'globex']);
        const [acme] = yield* source.cards(['acme']);
        expect(acme.inverse.flatMap((property) => property.values.map((value) => value.label))).toEqual([
          'ALICE',
          'BOB',
        ]);
      }
    }),
  );

  it.effect(
    'a column over related ids windows them in order, and filters once loaded',
    Effect.fnUntraced(function* () {
      const source = idsEntitySource(memoryEntitySource(toEntityCards(FACTS, { objects: true })), ['globex', 'bob']);
      expect((yield* source.window({ offset: 0, limit: 10 })).items.map((item) => item.id)).toEqual(['globex', 'bob']);
      expect((yield* source.window({ offset: 0, limit: 10, text: 'bo' })).items.map((item) => item.id)).toEqual([
        'bob',
      ]);
    }),
  );

  it.effect(
    'fact sources window subjects and group their facts',
    Effect.fnUntraced(function* () {
      const store = FactStoreLive.makeMemory();
      yield* store.putFacts(FACTS);
      for (const source of [memoryFactSource(FACTS), storeFactSource(store)]) {
        const window = yield* source.window({ offset: 0, limit: 10 });
        expect(window.items.map((item) => item.id)).toEqual(['alice', 'bob', 'carol']);
        const groups = yield* source.groups(['bob']);
        expect(groups.get('bob')?.facts.map((found) => found.id)).toEqual(['f2']);
      }
    }),
  );
});
