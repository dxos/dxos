//
// Copyright 2026 DXOS.org
//

import { DataFactory, type Quad as RdfQuad, type Term as RdfTerm } from 'n3';

import { type Quad, type Row, type Term } from '@dxos/sparql-sqlite';

const { literal, namedNode, quad } = DataFactory;

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

/** RDF/JS term → the engine's plain-data term. */
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

/** RDF/JS quad → engine quad (the default graph is the engine's absent `g`). */
export const toQuad = (triple: RdfQuad): Quad => ({
  s: toTerm(triple.subject),
  p: toTerm(triple.predicate),
  o: toTerm(triple.object),
  ...(triple.graph.termType === 'DefaultGraph' ? {} : { g: toTerm(triple.graph) }),
});

const toObject = (term: Term) =>
  term.termType === 'NamedNode'
    ? namedNode(term.value)
    : literal(
        term.value,
        term.termType === 'Literal' ? (term.language ?? (term.datatype && namedNode(term.datatype))) : undefined,
      );

/** `?fact ?p ?o` solutions as triples; rows that cannot be part of a fact's reification are skipped. */
export const rowsToTriples = (rows: readonly Row[]): RdfQuad[] =>
  rows.flatMap(({ fact, p, o }) =>
    fact?.termType === 'NamedNode' &&
    p?.termType === 'NamedNode' &&
    (o?.termType === 'NamedNode' || o?.termType === 'Literal')
      ? [quad(namedNode(fact.value), namedNode(p.value), toObject(o))]
      : [],
  );
