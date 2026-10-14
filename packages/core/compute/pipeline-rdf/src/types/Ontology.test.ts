//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ontology from './Ontology.ts';
import * as Vocab from './Vocab.ts';

describe('Ontology', () => {
  test('resolves a synonym and an inflection to the defined predicate', ({ expect }) => {
    expect(Ontology.DEFAULT.resolve('is on the team as').iri).toBe('https://schema.org/jobTitle');
    expect(Ontology.DEFAULT.resolve('Working-On').name).toBe('works_on');
    expect(Ontology.DEFAULT.resolve('worksOn').name).toBe('works_on');
  });

  test('seeds predicates from established vocabularies under their own IRIs', ({ expect }) => {
    expect(Ontology.DEFAULT.resolve('is a').iri).toBe(Vocab.RDF_TYPE);
    expect(Ontology.DEFAULT.resolve('employed by').iri).toBe('https://schema.org/worksFor');
    expect(Ontology.DEFAULT.resolve('knows').iri).toBe('http://xmlns.com/foaf/0.1/knows');
    expect(Ontology.DEFAULT.resolve('created by').iri).toBe('http://purl.org/dc/terms/creator');
    expect(Ontology.DEFAULT.resolve('claim').iri).toBe(`${Vocab.DX}claim`);
  });

  test('a predicate stored under its former dx: IRI reads and matches as the seed', ({ expect }) => {
    expect(Ontology.DEFAULT.get(`${Vocab.DX}hasRole`)?.label).toBe('has role');
    expect(Ontology.DEFAULT.equivalents('https://schema.org/jobTitle')).toEqual(
      new Set(['https://schema.org/jobTitle', `${Vocab.DX}hasRole`]),
    );
  });

  test('mints an unknown predicate in its namespace, labelled with its surface form', ({ expect }) => {
    const first = Ontology.DEFAULT.resolve('travels to');
    expect(first).toEqual({
      iri: `${Vocab.LOCAL_BRAIN}travelTo`,
      name: 'travel_to',
      label: 'travels to',
      definedBy: Vocab.LOCAL_BRAIN,
    });
    expect(Ontology.DEFAULT.resolve('traveling to').iri).toBe(first.iri);
    expect(Ontology.DEFAULT.get(first.iri)).toBeUndefined();

    const brain = Ontology.DEFAULT.withNamespace(Vocab.brainNamespace('agent-1'));
    expect(brain.resolve('travels to').iri).toBe('https://dxos.org/semantic/brain/agent-1/travelTo');
  });

  test('extends with a new predicate, and rejects a synonym claimed twice', ({ expect }) => {
    const ontology = Ontology.DEFAULT.extend([Ontology.entry('mentors', { synonyms: ['coaches'] })]);
    expect(ontology.resolve('Coaches').iri).toBe('https://dxos.org/ontology/mentors');
    expect(() => ontology.extend([Ontology.entry('trains', { synonyms: ['coaches'] })])).toThrow(/coaches/);
  });

  test('includes learned predicates, skipping those it already names', ({ expect }) => {
    const learned = Ontology.DEFAULT.include([
      Ontology.DEFAULT.resolve('travels to'),
      { iri: `${Vocab.LOCAL_BRAIN}employedBy`, name: 'employ_by', label: 'employed by' },
    ]);
    expect(learned.get(`${Vocab.LOCAL_BRAIN}travelTo`)?.label).toBe('travels to');
    expect(learned.get(`${Vocab.LOCAL_BRAIN}employedBy`)).toBeUndefined();
  });

  test('merges one predicate into another, keeping the merged one readable', ({ expect }) => {
    const minted = { ...Ontology.DEFAULT.resolve('gets paid by'), description: 'Employer.' };
    const merged = Ontology.DEFAULT.extend([{ ...minted, synonyms: ['on the payroll of'] }]).merge(
      minted.iri,
      'https://schema.org/worksFor',
    );
    expect(merged.resolve('on the payroll of').iri).toBe('https://schema.org/worksFor');
    expect(merged.get(minted.iri)?.replacedBy).toBe('https://schema.org/worksFor');
    expect(merged.equivalents('https://schema.org/worksFor').has(minted.iri)).toBe(true);
    // Either way round: a query by the merged-away IRI matches the survivor.
    expect(merged.equivalents(minted.iri).has('https://schema.org/worksFor')).toBe(true);
    expect(merged.canonical(minted.iri)?.iri).toBe('https://schema.org/worksFor');
  });

  test('round-trips an entry through the ontology graph', ({ expect }) => {
    const entry = Ontology.DEFAULT.get('https://schema.org/memberOf');
    expect(entry).toBeDefined();
    if (entry) {
      expect(Ontology.fromQuads(Ontology.toQuads(entry))).toEqual([entry]);
    }
  });

  test('reads an IRI it does not define by its local name', ({ expect }) => {
    expect(Ontology.labelFromIri('https://dxos.org/ontology/travelTo')).toBe('travel to');
  });
});
