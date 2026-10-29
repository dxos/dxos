//
// Copyright 2026 DXOS.org
//

import { DataFactory, type Quad as RdfQuad, type Term as RdfTerm } from 'n3';

import { type Quad, type Row, type Term } from '@dxos/sparql-sqlite';

const { blankNode, defaultGraph, literal, namedNode, quad } = DataFactory;

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

/** RDF/JS term -> the engine's plain-data term. */
export const toTerm = (term: RdfTerm): Term => {
  switch (term.termType) {
    case 'NamedNode':
    case 'BlankNode':
      return { termType: term.termType, value: term.value };
    case 'Literal':
      return term.language
        ? { termType: 'Literal', value: term.value, language: term.language }
        : term.datatype.value === XSD_STRING
          ? { termType: 'Literal', value: term.value }
          : { termType: 'Literal', value: term.value, datatype: term.datatype.value };
    default:
      throw new TypeError(`Unsupported term in a stored triple: ${term.termType}`);
  }
};

/** RDF/JS quad -> engine quad (the default graph is the engine's absent `g`). */
export const toQuad = (triple: RdfQuad): Quad => ({
  s: toTerm(triple.subject),
  p: toTerm(triple.predicate),
  o: toTerm(triple.object),
  ...(triple.graph.termType === 'DefaultGraph' ? {} : { g: toTerm(triple.graph) }),
});

const toResource = (term: Term) => (term.termType === 'BlankNode' ? blankNode(term.value) : namedNode(term.value));

const toObject = (term: Term) =>
  term.termType === 'Literal'
    ? literal(term.value, term.language ?? (term.datatype ? namedNode(term.datatype) : undefined))
    : toResource(term);

/**
 * `?g ?s ?p ?o` solutions as quads: a row with `?s` bound is a quad in graph `?g`, one without it is a default-graph
 * triple about `?g` (its provenance). Rows with a literal in a resource position are skipped.
 */
export const rowsToQuads = (rows: readonly Row[]): RdfQuad[] =>
  rows.flatMap(({ g, s, p, o }) => {
    if (g?.termType !== 'NamedNode' || p?.termType !== 'NamedNode' || o === undefined) {
      return [];
    }
    if (s === undefined) {
      return [quad(namedNode(g.value), namedNode(p.value), toObject(o), defaultGraph())];
    }
    return s.termType === 'Literal' ? [] : [quad(toResource(s), namedNode(p.value), toObject(o), namedNode(g.value))];
  });

/** The distinct graph IRIs a raw SELECT binds to `?g`, or to `?fact`, the variable of the earlier reified shape. */
export const boundGraphs = (rows: readonly Row[]): string[] => [
  ...new Set(
    rows.flatMap((row) => {
      const graph = row.g ?? row.fact;
      return graph?.termType === 'NamedNode' ? [graph.value] : [];
    }),
  ),
];
