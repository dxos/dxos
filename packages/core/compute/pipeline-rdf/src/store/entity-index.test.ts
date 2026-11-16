//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { type EntityKind, type Fact } from '../types/index.ts';
import * as FactStoreLive from './fact-store-live.ts';

const fact = (
  id: string,
  [subject, subjectKind]: [string, EntityKind],
  predicate: string,
  [object, objectKind]: [string, EntityKind],
): Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: subject, label: subject.toUpperCase(), type: subjectKind },
    predicate,
    object: { kind: 'entity', entity: object, label: object.toUpperCase(), type: objectKind },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: `dxn:q:${id}`, generatedAtTime: '2026-11-16T00:00:00.000Z' },
  recordedAt: '2026-11-16T00:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: id,
});

const FACTS: Fact[] = [
  fact('f1', ['alice', 'person'], 'works at', ['acme', 'org']),
  fact('f2', ['bob', 'person'], 'works at', ['acme', 'org']),
  fact('f3', ['bob', 'person'], 'knows', ['alice', 'person']),
  fact('f4', ['carol', 'person'], 'lives in', ['paris', 'place']),
];

describe('FactStoreLive windowed reads', () => {
  it.effect(
    'lists entities by label in windows, with the total and per-kind counts',
    Effect.fnUntraced(function* () {
      const store = FactStoreLive.makeMemory();
      yield* store.putFacts(FACTS);

      const first = yield* store.entities({ offset: 0, limit: 2 });
      expect(first.total).toBe(5);
      expect(first.items.map((item) => item.key)).toEqual(['acme', 'alice']);
      expect(first.items[0]).toEqual({ key: 'acme', label: 'ACME', kind: 'org' });
      expect(first.kinds).toEqual([
        { kind: 'person', count: 3 },
        { kind: 'org', count: 1 },
        { kind: 'place', count: 1 },
      ]);
      const second = yield* store.entities({ offset: 2, limit: 2 });
      expect(second.items.map((item) => item.key)).toEqual(['bob', 'carol']);

      // The kind narrows the window, not the per-kind counts; the text narrows both.
      const people = yield* store.entities({ offset: 0, limit: 10, kind: 'person', text: 'a' });
      expect(people.items.map((item) => item.key)).toEqual(['alice', 'carol']);
      expect(people.total).toBe(2);
      expect(people.kinds).toEqual([
        { kind: 'person', count: 2 },
        { kind: 'org', count: 1 },
        { kind: 'place', count: 1 },
      ]);

      // Subjects only, and only those stating a predicate.
      const subjects = yield* store.entities({ offset: 0, limit: 10, role: 'subject' });
      expect(subjects.items.map((item) => item.key)).toEqual(['alice', 'bob', 'carol']);
      // The minted predicate's IRI is the store's to choose, so it is found by its usage.
      const usage = yield* store.predicateUsage();
      const iri = Object.keys(usage).find((candidate) => candidate.toLowerCase().includes('work'));
      expect(iri && usage[iri]).toBe(2);
      const employers = yield* store.entities({
        offset: 0,
        limit: 10,
        role: 'subject',
        predicates: iri ? [iri] : [],
      });
      expect(employers.items.map((item) => item.key)).toEqual(['alice', 'bob']);
    }),
  );

  it.effect(
    'loads the facts naming the entities asked for, and sees later writes',
    Effect.fnUntraced(function* () {
      const store = FactStoreLive.makeMemory();
      yield* store.putFacts(FACTS);

      expect((yield* store.entityFacts({ keys: ['alice'] })).map((found) => found.id).sort()).toEqual(['f1', 'f3']);
      // Read by key from the tables, the facts match what the SPARQL query reassembles, provenance and labels included.
      const byId = (facts: readonly Fact[]) => [...facts].sort((left, right) => left.id.localeCompare(right.id));
      expect(byId(yield* store.entityFacts({ keys: ['alice'] }))).toEqual(
        byId(yield* store.query({ entity: 'alice' })),
      );
      expect((yield* store.entityFacts({ keys: ['alice'], role: 'subject' })).map((found) => found.id)).toEqual(['f1']);
      expect((yield* store.entityFacts({ keys: ['acme'], limit: 1 })).length).toBe(1);

      yield* store.putFacts([fact('f5', ['dave', 'person'], 'works at', ['acme', 'org'])]);
      expect((yield* store.entities({ offset: 0, limit: 10 })).total).toBe(6);
      expect((yield* store.entityFacts({ keys: ['acme'] })).map((found) => found.id).sort()).toEqual([
        'f1',
        'f2',
        'f5',
      ]);
    }),
  );
});
