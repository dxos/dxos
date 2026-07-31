//
// Copyright 2026 DXOS.org
//

import { PROV, SX, entityIri } from '../vocab';

export type SemanticQuery = {
  /** Entity id constrained to the subject position. */
  readonly subjectEntity?: string;
  /** Assertion predicate (verb). */
  readonly predicate?: string;
  /** Entity id appearing as subject OR object. */
  readonly entity?: string;
  /** Provenance source DXN. */
  readonly source?: string;
  /** Lower bound (inclusive) on factuality confidence. */
  readonly minConfidence?: number;
};

/** Build a SELECT returning each matching fact node and all its annotation props. */
export const buildSparql = (query: SemanticQuery): string => {
  const patterns: string[] = [];
  if (query.subjectEntity) {
    patterns.push(`?fact <${SX}subject> <${entityIri(query.subjectEntity).value}> .`);
  }
  if (query.predicate) {
    patterns.push(`?fact <${SX}predicate> ${JSON.stringify(query.predicate)} .`);
  }
  if (query.source) {
    patterns.push(`?fact <${PROV}wasDerivedFrom> ${JSON.stringify(query.source)} .`);
  }
  if (query.entity) {
    const iri = entityIri(query.entity).value;
    patterns.push(`{ ?fact <${SX}subject> <${iri}> } UNION { ?fact <${SX}object> <${iri}> }`);
  }
  let confFilter = '';
  if (query.minConfidence !== undefined) {
    if (!Number.isFinite(query.minConfidence)) {
      throw new TypeError('minConfidence must be a finite number.');
    }
    patterns.push(`?fact <${SX}confidence> ?conf .`);
    confFilter = `FILTER(xsd:decimal(?conf) >= ${query.minConfidence})`;
  }
  // No-filter fallback: bind every fact node via its required subject triple.
  if (patterns.length === 0) {
    patterns.push(`?fact <${SX}subject> ?anySubject .`);
  }
  const inner = [...patterns, confFilter].filter(Boolean).join(' ');
  return [
    'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
    'SELECT ?fact ?p ?o WHERE {',
    `  { SELECT DISTINCT ?fact WHERE { ${inner} } }`,
    '  ?fact ?p ?o .',
    '}',
  ].join('\n');
};
