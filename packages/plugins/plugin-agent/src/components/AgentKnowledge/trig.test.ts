//
// Copyright 2026 DXOS.org
//

import { Parser } from 'n3';
import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import { TRIG_PREFIXES, formatNamedGraphs, formatRawFact } from './trig.ts';

const fact = (id: string, predicate: string, object: string, quote: string): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: 'rich-burdon', label: 'Rich Burdon' },
    predicate,
    object: { kind: 'entity', entity: object, label: object.toUpperCase() },
    quote,
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: 'https://dxos.org/team', generatedAtTime: '2026-10-13T07:30:00Z' },
  recordedAt: '2026-10-13T07:30:05Z',
  extractor: { id: 'default', model: 'model', version: '1' },
  sourceHash: 'abc',
});

const ROLE = fact('f1', 'is a', 'founder', 'Rich is a founder of DXOS');
const MEMBER = fact('f2', 'is member of', 'dxos', 'Rich is a founder of DXOS');
const OTHER = fact('f3', 'works at', 'dxos', 'Rich works at DXOS');

const RICH = 'echo://BBW5ANOFUMCIHWGKE2W3JFTXJUOATRJKF/01M4Q8RICH0000000000000000';

describe('formatNamedGraphs', () => {
  test('writes TriG a standard parser reads, with the statements as real triples in named graphs', ({ expect }) => {
    const quads = new Parser({ format: 'application/trig' }).parse(formatNamedGraphs([ROLE, MEMBER, OTHER]));
    const statements = quads.filter((quad) => quad.graph.termType === 'NamedNode');
    expect(statements.map((quad) => quad.predicate.value)).toEqual(
      expect.arrayContaining(['https://dxos.org/ontology/a', 'https://dxos.org/ontology/memberOf']),
    );
    expect(statements.some((quad) => quad.predicate.value === 'https://dxos.org/semantic#predicate')).toBe(false);
  });

  test('puts facts that share provenance in one graph and states the provenance once per graph', ({ expect }) => {
    const quads = new Parser({ format: 'application/trig' }).parse(formatNamedGraphs([ROLE, MEMBER, OTHER]));
    const graphs = new Set(quads.filter((quad) => quad.graph.termType === 'NamedNode').map((quad) => quad.graph.value));
    expect(graphs.size).toBe(2);
    const derived = quads.filter((quad) => quad.predicate.value === 'http://www.w3.org/ns/prov#wasDerivedFrom');
    expect(derived.map((quad) => quad.subject.value).toSorted()).toEqual([...graphs].toSorted());
  });

  test('uses real IRIs where known, ontology names where given, and graph-scoped entities otherwise', ({ expect }) => {
    const trig = formatNamedGraphs([ROLE, MEMBER], {
      entities: { 'rich-burdon': RICH },
      predicates: { a: 'hasRole' },
    });
    expect(trig).toContain(`<${RICH}> dx:hasRole g1:founder .`);
    expect(trig).toContain('g1:founder rdfs:label "FOUNDER" .');
    expect(trig).toContain('sx:synonym "is a" .');
  });
});

const STORED_FACT: RDF.Fact = {
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
    const trig = formatRawFact(STORED_FACT);
    expect(trig).toMatch(/^fact:f1 \{/m);
    // Unresolved entities are local to the fact's graph, under a prefix of their own.
    expect(trig).toContain('@prefix g1: <https://dxos.org/semantic/fact/f1#>.');
    expect(trig).toContain('g1:rich-burdon schema:jobTitle g1:founder');
    expect(trig).toContain('prov:wasDerivedFrom "https://dxos.org/team"');
    expect(trig).not.toContain('@prefix dx:');
    expect(TRIG_PREFIXES).toContain('@prefix dx: <https://dxos.org/ontology/>.');
  });
});
