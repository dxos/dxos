//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { TRIG_PREFIXES, formatRawFact } from './trig.ts';

const fact: RDF.Fact = {
  id: 'f1',
  assertion: {
    subject: { kind: 'entity', entity: 'rich-burdon', label: 'Rich Burdon' },
    predicate: 'is on the team as',
    object: { kind: 'entity', entity: 'founder', label: 'Founder' },
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'https://dxos.org/team', generatedAtTime: '2026-10-13T07:30:00Z' },
  recordedAt: '2026-10-13T07:30:05Z',
  extractor: { id: 'doc', model: 'model', version: '1' },
  sourceHash: 'abc',
};

describe('formatRawFact', () => {
  test('writes the statement as a triple inside its graph, with an ontology predicate', ({ expect }) => {
    const trig = formatRawFact(fact);
    expect(trig).toMatch(/^fact:f1 \{/);
    expect(trig).toContain('entity:rich-burdon dx:hasRole entity:founder');
    expect(trig).toContain('prov:wasDerivedFrom "https://dxos.org/team"');
    expect(trig).not.toContain('@prefix');
    expect(TRIG_PREFIXES).toContain('@prefix dx: <https://dxos.org/ontology/>.');
  });
});
