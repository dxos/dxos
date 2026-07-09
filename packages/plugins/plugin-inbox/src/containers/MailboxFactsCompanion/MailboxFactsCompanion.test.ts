//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';

import { queryFacts } from './MailboxFactsCompanion';

const mk = (over: Partial<RDF.Fact> & Pick<RDF.Fact, 'id'>): RDF.Fact => ({
  assertion: { subject: { entity: 'alice' }, predicate: 'travelsTo', object: { entity: 'paris' } },
  factuality: { value: 'PR+', polarity: '+', confidence: 0.6 },
  attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
  recordedAt: '2026-06-06T12:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
  ...over,
});

describe('queryFacts', () => {
  test('reads all facts from a seeded store', async ({ expect }) => {
    const store = FactStore.makeMemory();
    await EffectEx.runPromise(store.putFacts([mk({ id: 'f1' })]));

    const facts = await queryFacts(store);
    expect(facts).toHaveLength(1);
    expect(facts[0].assertion.predicate).toBe('travelsTo');
  });

  test('returns an empty list for an empty store', async ({ expect }) => {
    const store = FactStore.makeMemory();
    const facts = await queryFacts(store);
    expect(facts).toEqual([]);
  });
});
