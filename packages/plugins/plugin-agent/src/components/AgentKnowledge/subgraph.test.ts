//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { toEntityCards } from './subgraph.ts';

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
      ['works at', ['Acme']],
      ['knows', ['Bob', 'Carol']],
    ]);
  });

  test('lists what points at an entity under the inverse label, and gives objects no card of their own', ({
    expect,
  }) => {
    const cards = toEntityCards(FACTS, { inverses: { know: 'Known by' } });
    expect(cards.map(({ id }) => id)).toEqual(['alice', 'bob']);
    expect(cards[0].inverse).toEqual([
      { predicate: 'know', label: 'Known by', values: [{ kind: 'entity', id: 'bob', label: 'Bob' }] },
    ]);
    expect(cards[1].inverse.map(({ label }) => label)).toEqual(['Known by']);
  });
});
