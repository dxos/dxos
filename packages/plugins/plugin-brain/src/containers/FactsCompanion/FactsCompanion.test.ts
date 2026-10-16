//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { mergeFacts } from './use-facts.ts';

const mk = (over: Partial<RDF.Fact> & Pick<RDF.Fact, 'id'>): RDF.Fact => ({
  assertion: {
    subject: { kind: 'entity', entity: 'alice' },
    predicate: 'travelsTo',
    object: { kind: 'entity', entity: 'paris' },
  },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6 },
  attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
  ...over,
});

describe('mergeFacts', () => {
  test('keeps each fact once across brains', ({ expect }) => {
    const facts = mergeFacts([[mk({ id: 'f1' }), mk({ id: 'f2' })], [mk({ id: 'f2' })], []]);
    expect(facts.map(({ id }) => id)).toEqual(['f1', 'f2']);
  });

  test('is empty without brains', ({ expect }) => {
    expect(mergeFacts([])).toEqual([]);
  });
});
