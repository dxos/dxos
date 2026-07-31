//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Fact } from '../../types';
import { factToTriples, triplesToFacts } from './mapping';

const FACT: Fact = {
  id: 'fact-1',
  assertion: {
    subject: { entity: 'alice' },
    predicate: 'travelsTo',
    object: { entity: 'paris' },
    validFrom: '2026-06-12',
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6, nature: 'epistemic' },
  attribution: { agent: 'alice', source: 'dxn:queue:x:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
};

describe('fact ↔ triples mapping', () => {
  test('round-trips a fact through reified triples', ({ expect }) => {
    const quads = factToTriples(FACT);
    expect(quads.length).toBeGreaterThan(5);
    const [back] = triplesToFacts(quads);
    expect(back).toEqual(FACT);
  });

  test('round-trips a fact with a literal object and no agent', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-2',
      assertion: { subject: { entity: 'meeting' }, predicate: 'scheduledFor', object: { literal: '2026-07-15' } },
      attribution: { source: 'dxn:queue:x:m3', generatedAtTime: '2026-06-08T00:00:00.000Z' },
    };
    const [back] = triplesToFacts(factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips a fact with wasDerivedFrom and span', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-3',
      attribution: {
        source: 'dxn:queue:x:m4',
        generatedAtTime: '2026-06-09T00:00:00.000Z',
        wasDerivedFrom: ['dxn:a', 'dxn:b'],
        span: { start: 0, end: 12 },
      },
    };
    const [back] = triplesToFacts(factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('round-trips entity display labels (preserving surface casing)', ({ expect }) => {
    const fact: Fact = {
      ...FACT,
      id: 'fact-4',
      assertion: {
        subject: { entity: 'dxos', label: 'DXOS' },
        predicate: 'is',
        object: { entity: 'open-source-project', label: 'an open source project' },
      },
    };
    const [back] = triplesToFacts(factToTriples(fact));
    expect(back).toEqual(fact);
  });

  test('throws when a required predicate triple is missing', ({ expect }) => {
    const quads = factToTriples(FACT).filter((quad) => !quad.predicate.value.endsWith('#predicate'));
    expect(() => triplesToFacts(quads)).toThrow();
  });
});
