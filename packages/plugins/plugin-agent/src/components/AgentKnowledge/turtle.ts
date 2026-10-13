//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/** The vocabularies a stored fact's triples use, as Turtle prefixes. */
const PREFIXES: readonly (readonly [prefix: string, iri: string])[] = [
  ['fact', RDF.Vocab.FACT],
  ['entity', RDF.Vocab.ENTITY],
  ['sx', RDF.Vocab.SX],
  ['prov', RDF.Vocab.PROV],
];

export const TURTLE_PREFIXES = PREFIXES.map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .`).join('\n');

/** An IRI by its prefix when one covers it, else in full; a literal quoted. */
const formatNode = (term: { termType: string; value: string }): string => {
  if (term.termType !== 'NamedNode') {
    return JSON.stringify(term.value);
  }
  const prefix = PREFIXES.find(([, iri]) => term.value.startsWith(iri));
  return prefix ? `${prefix[0]}:${term.value.slice(prefix[1].length)}` : `<${term.value}>`;
};

/**
 * The fact as the brain stores it, in Turtle: one reified fact node whose subject, predicate and object are
 * annotations alongside its provenance (pipeline-rdf's `factToTriples`).
 */
export const formatRawFact = (fact: RDF.Fact): string => {
  const triples = RDF.Mapping.factToTriples(fact);
  const subject = triples[0] ? formatNode(triples[0].subject) : '';
  const lines = triples.map(
    (triple, index) =>
      `  ${formatNode(triple.predicate)} ${formatNode(triple.object)} ${index === triples.length - 1 ? '.' : ';'}`,
  );
  return [subject, ...lines].join('\n');
};
