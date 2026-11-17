//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { RDF } from '@dxos/pipeline-rdf';

import { type TextItem } from '../sources/text-item.ts';
import { mentionFacts, sentimentFacts } from './facts.ts';
import { findTickers } from './tickers.ts';
import { ANNOTATIONS, FINANCE, PACKS, SCHEMA_FINANCE, companyIri, ontology } from './vocabulary.ts';

const ITEM: TextItem = {
  key: { source: 'news.google.com', id: 'CBMi1' },
  title: 'Nvidia beats estimates; $AMD slips',
  link: 'https://example.com/nvda',
  publisher: 'Reuters',
  published: '2026-11-01T12:00:00.000Z',
};
const EXTRACTOR = { id: 'finance-test', model: 'regex', version: '1' };

describe('finance vocabulary', () => {
  test('every finance term survives composition onto the seed and schema.org', () => {
    const composed = ontology();
    for (const entry of [...SCHEMA_FINANCE.entries, ...FINANCE.entries]) {
      // tickerSymbol is the one term both finance packs and the seed may share; any other loss is a synonym clash.
      expect(composed.get(entry.iri), entry.name).toBeDefined();
    }
    expect(composed.find('takes over')?.iri).toBe('https://dxos.org/ontology/finance/acquires');
    expect(composed.find('has ticker symbol')?.iri).toBe('https://schema.org/tickerSymbol');
    expect(PACKS).toHaveLength(2);
  });
});

describe('annotation facts', () => {
  test('the mention index links the article to each company and its ticker', () => {
    const facts = mentionFacts(ITEM, findTickers(ITEM.title), EXTRACTOR);
    const mentioned = facts
      .filter((fact) => fact.assertion.predicateIri === ANNOTATIONS.mentions.iri)
      .map((fact) => RDF.termValue(fact.assertion.object));
    expect(mentioned).toEqual([companyIri('NVDA'), companyIri('AMD')]);
    expect(facts.every((fact) => fact.attribution.source === 'news.google.com:CBMi1' && fact.graph)).toBe(true);
    // Deterministic: the same item writes the same statements.
    expect(mentionFacts(ITEM, findTickers(ITEM.title), EXTRACTOR).map(({ id }) => id)).toEqual(
      facts.map(({ id }) => id),
    );
  });

  test('sentiment per article and per ticker, each ticker in a graph of its own', () => {
    const facts = sentimentFacts(
      ITEM,
      { polarity: 'positive', score: 0.4 },
      [
        { ticker: 'NVDA', name: 'Nvidia', polarity: 'positive', score: 0.8 },
        { ticker: 'AMD', polarity: 'negative', score: -0.5 },
      ],
      EXTRACTOR,
    );
    expect(new Set(facts.map(({ graph }) => graph)).size).toBe(3);
    const literals = facts
      .filter((fact) => fact.assertion.predicateIri === ANNOTATIONS.sentimentScore.iri)
      .map((fact) => RDF.termValue(fact.assertion.object));
    expect(literals).toEqual(['0.40', '0.80', '-0.50']);
  });
});
