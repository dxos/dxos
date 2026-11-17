//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';
import { describe, test } from 'vitest';

import * as Ontology from './Ontology.ts';
import * as Sparql from './Sparql.ts';

const IS_A = Ontology.DEFAULT.resolve('is a').iri;
const WORKS_AT = Ontology.DEFAULT.resolve('works at').iri;
const STORED = new Map([
  [IS_A, 'is a'],
  [WORKS_AT, 'works at'],
]);

describe('matchingPredicates', () => {
  test('matches whole words of the relation key, not characters', ({ expect }) => {
    // `is a` keys as `a`, which is a substring of `work_at` but not one of its words.
    expect(Sparql.matchingPredicates('work at', STORED)).toEqual(new Set([WORKS_AT]));
    expect(Sparql.matchingPredicates('is working at', STORED)).toEqual(new Set([WORKS_AT]));
  });

  test('a query that names part of a relation still finds it', ({ expect }) => {
    expect(Sparql.matchingPredicates('works', STORED).has(WORKS_AT)).toBe(true);
  });
});

const { defaultGraph, literal, namedNode, quad } = DataFactory;

const XSD_DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal';
const GRAPH = 'https://example.com/graph/1';

describe('terms', () => {
  test('toQuad keeps literal datatypes and languages, and drops the default graph', ({ expect }) => {
    const typed = Sparql.toQuad(
      quad(namedNode('urn:s'), namedNode('urn:p'), literal('0.6', namedNode(XSD_DECIMAL)), defaultGraph()),
    );
    expect(typed).toEqual({
      s: { termType: 'NamedNode', value: 'urn:s' },
      p: { termType: 'NamedNode', value: 'urn:p' },
      o: { termType: 'Literal', value: '0.6', datatype: XSD_DECIMAL },
    });
    const tagged = Sparql.toQuad(
      quad(namedNode('urn:s'), namedNode('urn:p'), literal('bonjour', 'fr'), namedNode(GRAPH)),
    );
    expect(tagged.o).toEqual({ termType: 'Literal', value: 'bonjour', language: 'fr' });
    expect(tagged.g).toEqual({ termType: 'NamedNode', value: GRAPH });
  });

  test('rowsToQuads restores literal datatypes and languages in graph and provenance rows', ({ expect }) => {
    const [statement, provenance] = Sparql.rowsToQuads([
      {
        g: { termType: 'NamedNode', value: GRAPH },
        s: { termType: 'NamedNode', value: 'urn:s' },
        p: { termType: 'NamedNode', value: 'urn:p' },
        o: { termType: 'Literal', value: 'bonjour', language: 'fr' },
      },
      {
        g: { termType: 'NamedNode', value: GRAPH },
        p: { termType: 'NamedNode', value: 'urn:confidence' },
        o: { termType: 'Literal', value: '0.6', datatype: XSD_DECIMAL },
      },
    ]);
    expect(statement.object.equals(literal('bonjour', 'fr'))).toBe(true);
    expect(statement.graph.equals(namedNode(GRAPH))).toBe(true);
    expect(provenance.subject.equals(namedNode(GRAPH))).toBe(true);
    expect(provenance.object.equals(literal('0.6', namedNode(XSD_DECIMAL)))).toBe(true);
    expect(provenance.graph.termType).toBe('DefaultGraph');
  });
});
