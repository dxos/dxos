//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { TURTLE_PREFIXES, formatRawFact } from './turtle.ts';

const fact: RDF.Fact = {
  id: 'f1',
  assertion: {
    subject: { kind: 'entity', entity: 'rich-burdon', label: 'Rich Burdon' },
    predicate: 'works at',
    object: { kind: 'entity', entity: 'dxos', label: 'DXOS' },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'https://dxos.org/team', generatedAtTime: '2026-10-13T07:30:00Z' },
  recordedAt: '2026-10-13T07:30:05Z',
  extractor: { id: 'doc', model: 'model', version: '1' },
  sourceHash: 'abc',
};

describe('formatRawFact', () => {
  test('writes the stored reification: a fact node whose predicate is a literal, not a free-text IRI', ({ expect }) => {
    const turtle = formatRawFact(fact);
    expect(turtle.split('\n').slice(0, 4)).toEqual([
      'fact:f1',
      '  sx:subject entity:rich-burdon ;',
      '  sx:predicate "works at" ;',
      '  sx:object entity:dxos ;',
    ]);
    expect(turtle).toContain('prov:wasDerivedFrom "https://dxos.org/team" ;');
    expect(turtle.endsWith(' .')).toBe(true);
    expect(TURTLE_PREFIXES).toContain('@prefix sx: <https://dxos.org/semantic#> .');
  });
});
