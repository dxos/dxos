//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { propertyKey, related, toEntityCards } from './subgraph.ts';

const fact = (id: string, subject: RDF.Term, predicate: string, object: RDF.Term): RDF.Fact => ({
  id,
  assertion: { subject, predicate, object },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'https://example.com/alice', generatedAtTime: '2026-10-13T07:30:00Z' },
  recordedAt: '2026-10-13T07:30:05Z',
  extractor: { id: 'default', model: 'model', version: '1' },
  sourceHash: 'abc',
});

const alice: RDF.Term = { kind: 'entity', entity: 'alice', label: 'Alice Chen' };
const bob: RDF.Term = { kind: 'entity', entity: 'bob', label: 'Bob' };
const acme: RDF.Term = { kind: 'entity', entity: 'acme', label: 'Acme' };

const FACTS = [
  fact('1', alice, 'works at', acme),
  fact('2', alice, 'knows', bob),
  fact('3', alice, 'knows', { kind: 'entity', entity: 'carol', label: 'Carol' }),
  fact('4', bob, 'knows', alice),
  fact('5', alice, 'knows', bob),
];

describe('toEntityCards', () => {
  test('gives each subject a card with its statements grouped by predicate, without repeats', ({ expect }) => {
    const [card] = toEntityCards(FACTS, { types: { alice: 'Person' } });
    expect(card).toMatchObject({ id: 'alice', label: 'Alice Chen', type: 'Person' });
    expect(card.properties.map(({ label, values }) => [label, values.map((value) => value.label)])).toEqual([
      ['works-at', ['Acme']],
      ['knows', ['Bob', 'Carol']],
    ]);
  });

  test('takes a class the facts state for an entity when the caller names none, the caller winning', ({ expect }) => {
    const typed = [
      fact('1', { ...alice, type: 'person' }, 'works at', { ...acme, type: 'org' }),
      fact('2', { ...bob, type: 'person' }, 'knows', alice),
    ];
    const cards = toEntityCards(typed, { types: { bob: 'Colleague' }, objects: true });
    expect(cards.map(({ id, type }) => [id, type])).toEqual([
      ['alice', 'Person'],
      ['acme', 'Organization'],
      ['bob', 'Colleague'],
    ]);
    expect(cards[0].properties[0].values[0]).toMatchObject({ id: 'acme', type: 'Organization' });
  });

  test('lists what points at an entity under the inverse label, and gives objects no card of their own', ({
    expect,
  }) => {
    const cards = toEntityCards(FACTS, { inverses: { know: 'known-by' } });
    expect(cards.map(({ id }) => id)).toEqual(['alice', 'bob']);
    expect(cards[0].inverse).toEqual([
      { predicate: 'know', label: 'known-by', values: [{ kind: 'entity', id: 'bob', label: 'Bob' }] },
    ]);
    expect(cards[1].inverse.map(({ label }) => label)).toEqual(['known-by']);
  });
});

describe('related', () => {
  test('opens a chip on its entity, a row on its values, and a card on every neighbour', ({ expect }) => {
    const cards = toEntityCards(FACTS, { objects: true });
    const [alice] = cards;
    expect(related(alice, { cardId: 'alice', entity: 'carol' })).toEqual(['carol']);
    expect(related(alice, { cardId: 'alice', property: propertyKey('out', 'know') })).toEqual(['bob', 'carol']);
    expect(related(alice, { cardId: 'alice', property: propertyKey('in', 'know') })).toEqual(['bob']);
    expect(related(alice, { cardId: 'alice' })).toEqual(['acme', 'bob', 'carol']);
    expect(cards.map(({ id }) => id)).toEqual(['alice', 'acme', 'bob', 'carol']);
  });
});
