//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Ontology from './Ontology.ts';
import * as Vocab from './Vocab.ts';
import * as Vocabularies from './Vocabularies.ts';

describe('Vocabularies', () => {
  test('every pack composes onto the seed without losing a predicate', () => {
    const ontology = Vocabularies.compose(Vocabularies.ALL);
    const missing = Vocabularies.ALL.flatMap(({ entries }) => entries)
      .filter(({ iri }) => !ontology.get(iri))
      .map(({ iri }) => iri);
    expect(missing).toEqual([]);
    expect(ontology.entries.length).toBe(
      Ontology.DEFAULT.entries.length + Vocabularies.ALL.reduce((sum, { entries }) => sum + entries.length, 0),
    );
  });

  test('a pack predicate resolves from its surface forms to the vocabulary IRI', () => {
    const ontology = Vocabularies.compose([Vocabularies.SIOC]);
    expect(ontology.find('replies to')?.iri).toBe(`${Vocab.SIOC}reply_of`);
    expect(ontology.find('posted in')?.definedBy).toBe(Vocab.SIOC);
    expect(Ontology.DEFAULT.find('replies to')).toBeUndefined();
  });

  test('parse names packs by id', () => {
    expect(Vocabularies.parse('schema, sioc').map(({ id }) => id)).toEqual(['schema', 'sioc']);
    expect(Vocabularies.parse('all')).toHaveLength(Vocabularies.ALL.length);
    expect(() => Vocabularies.parse('nope')).toThrow(/Unknown vocabulary/);
  });
});
