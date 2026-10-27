//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';
import { describe, test } from 'vitest';

import { rowsToQuads, toQuad } from './terms.ts';

const { defaultGraph, literal, namedNode, quad } = DataFactory;

const XSD_DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal';
const GRAPH = 'https://example.com/graph/1';

describe('terms', () => {
  test('toQuad keeps literal datatypes and languages, and drops the default graph', ({ expect }) => {
    const typed = toQuad(
      quad(namedNode('urn:s'), namedNode('urn:p'), literal('0.6', namedNode(XSD_DECIMAL)), defaultGraph()),
    );
    expect(typed).toEqual({
      s: { termType: 'NamedNode', value: 'urn:s' },
      p: { termType: 'NamedNode', value: 'urn:p' },
      o: { termType: 'Literal', value: '0.6', datatype: XSD_DECIMAL },
    });
    const tagged = toQuad(quad(namedNode('urn:s'), namedNode('urn:p'), literal('bonjour', 'fr'), namedNode(GRAPH)));
    expect(tagged.o).toEqual({ termType: 'Literal', value: 'bonjour', language: 'fr' });
    expect(tagged.g).toEqual({ termType: 'NamedNode', value: GRAPH });
  });

  test('rowsToQuads restores literal datatypes and languages in graph and provenance rows', ({ expect }) => {
    const [statement, provenance] = rowsToQuads([
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
