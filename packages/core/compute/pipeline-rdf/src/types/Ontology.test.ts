//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ontology from './Ontology.ts';

describe('Ontology', () => {
  test('resolves a synonym and an inflection to the defined predicate', ({ expect }) => {
    expect(Ontology.DEFAULT.resolve('is on the team as').iri).toBe('https://dxos.org/ontology/hasRole');
    expect(Ontology.DEFAULT.resolve('Working-On').name).toBe('works_on');
    expect(Ontology.DEFAULT.resolve('worksOn').name).toBe('works_on');
  });

  test('mints an unknown predicate deterministically, labelled with its surface form', ({ expect }) => {
    const first = Ontology.DEFAULT.resolve('travels to');
    expect(first).toEqual({ iri: 'https://dxos.org/ontology/travelTo', name: 'travel_to', label: 'travels to' });
    expect(Ontology.DEFAULT.resolve('traveling to').iri).toBe(first.iri);
    expect(Ontology.DEFAULT.get(first.iri)).toBeUndefined();
  });

  test('extends with a new predicate, and rejects a synonym claimed twice', ({ expect }) => {
    const ontology = Ontology.DEFAULT.extend([Ontology.entry('mentors', { synonyms: ['coaches'] })]);
    expect(ontology.resolve('Coaches').iri).toBe('https://dxos.org/ontology/mentors');
    expect(() => ontology.extend([Ontology.entry('trains', { synonyms: ['coaches'] })])).toThrow(/coaches/);
  });

  test('reads an IRI it does not define by its local name', ({ expect }) => {
    expect(Ontology.labelFromIri('https://dxos.org/ontology/travelTo')).toBe('travel to');
  });
});
