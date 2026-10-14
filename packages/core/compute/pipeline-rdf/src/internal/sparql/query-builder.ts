//
// Copyright 2026 DXOS.org
//

import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';

export type SemanticQuery = {
  /** Entity key (slug or IRI) constrained to the subject position. */
  readonly subjectEntity?: string;
  /** Assertion predicate: its IRI, or a surface form resolved through the ontology. */
  readonly predicate?: string;
  /** Entity key (slug or IRI) appearing as subject OR object. */
  readonly entity?: string;
  /** Provenance source DXN. */
  readonly source?: string;
  /** Lower bound (inclusive) on factuality confidence. */
  readonly minConfidence?: number;
};

/** The predicate IRI a query's predicate names. */
export const predicateIri = (predicate: string, ontology: Ontology.Ontology = Ontology.DEFAULT): string =>
  Vocab.isIri(predicate) ? predicate : ontology.resolve(predicate).iri;

/** Build a SELECT returning each named graph that holds a matching statement (`?g`). */
export const buildSparql = (query: SemanticQuery, ontology: Ontology.Ontology = Ontology.DEFAULT): string => {
  const patterns: string[] = [];
  if (query.subjectEntity) {
    patterns.push(`GRAPH ?g { <${Vocab.entityNode(query.subjectEntity).value}> ?sp ?so }`);
  }
  if (query.predicate) {
    patterns.push(`GRAPH ?g { ?ps <${predicateIri(query.predicate, ontology)}> ?po }`);
  }
  if (query.source) {
    patterns.push(`?g <${Vocab.PROV}wasDerivedFrom> ${JSON.stringify(query.source)} .`);
  }
  if (query.entity) {
    const iri = Vocab.entityNode(query.entity).value;
    patterns.push(`{ GRAPH ?g { <${iri}> ?ep ?eo } } UNION { GRAPH ?g { ?es ?ep <${iri}> } }`);
  }
  let confFilter = '';
  if (query.minConfidence !== undefined) {
    if (!Number.isFinite(query.minConfidence)) {
      throw new TypeError('minConfidence must be a finite number.');
    }
    patterns.push(`?g <${Vocab.SX}confidence> ?conf .`);
    confFilter = `FILTER(xsd:decimal(?conf) >= ${query.minConfidence})`;
  }
  // No-filter fallback: every stored graph.
  if (patterns.length === 0) {
    patterns.push(`?g <${Vocab.RDF_TYPE}> <${Vocab.SX_GRAPH}> .`);
  }
  return [
    'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
    'SELECT DISTINCT ?g WHERE {',
    ...[...patterns, confFilter].filter(Boolean).map((pattern) => `  ${pattern}`),
    '}',
  ].join('\n');
};
