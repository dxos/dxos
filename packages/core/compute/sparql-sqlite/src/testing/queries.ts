//
// Copyright 2026 DXOS.org
//

import { agentIri, entityIri, factIri, fileIri } from './gen.ts';

export const PREFIXES = `PREFIX sx: <https://dxos.org/sx#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX deus: <https://dxos.org/vocab/deus#>
`;

export type QueryDef = { id: string; description: string; feature: string; sparql: string };

/**
 * The fixed query set. Every variant runs these exact strings; results are compared by row count
 * and order-insensitive checksum (see `checksumRows`).
 */
export const QUERIES: QueryDef[] = [
  {
    id: 'Q1_lookup',
    description: 'All properties of one fact node',
    feature: 'single bound-subject pattern',
    sparql: `${PREFIXES}SELECT ?p ?o WHERE { <${factIri(123)}> ?p ?o }`,
  },
  {
    id: 'Q2_entity',
    description: 'pipeline-rdf buildSparql({entity}) - production shape: UNION + DISTINCT subselect + expand',
    feature: 'UNION, subquery, DISTINCT',
    sparql: `${PREFIXES}SELECT ?fact ?p ?o WHERE {
  { SELECT DISTINCT ?fact WHERE { { ?fact sx:subject <${entityIri(40)}> } UNION { ?fact sx:object <${entityIri(40)}> } } }
  ?fact ?p ?o .
}`,
  },
  {
    id: 'Q3_filtered',
    description: 'buildSparql({subjectEntity, minConfidence}) - typed numeric FILTER',
    feature: 'FILTER with xsd:decimal cast',
    sparql: `${PREFIXES}SELECT ?fact ?p ?o WHERE {
  { SELECT DISTINCT ?fact WHERE { ?fact sx:subject <${entityIri(3)}> . ?fact sx:confidence ?conf . FILTER(xsd:decimal(?conf) >= 0.8) } }
  ?fact ?p ?o .
}`,
  },
  {
    id: 'Q4_asof',
    description: 'Latest 10 facts about an entity before a time (as-of)',
    feature: 'dateTime FILTER, ORDER BY, LIMIT',
    sparql: `${PREFIXES}SELECT ?fact ?pred ?t WHERE {
  ?fact sx:subject <${entityIri(1)}> ; sx:predicate ?pred ; prov:generatedAtTime ?t .
  FILTER(?t <= "2026-03-01T00:00:00Z"^^xsd:dateTime)
} ORDER BY DESC(?t) LIMIT 10`,
  },
  {
    id: 'Q5_aggregate',
    description: 'Top predicates by fact count (full scan of one predicate)',
    feature: 'GROUP BY, COUNT, ORDER BY',
    sparql: `${PREFIXES}SELECT ?pred (COUNT(?fact) AS ?n) WHERE { ?fact sx:predicate ?pred } GROUP BY ?pred ORDER BY DESC(?n) ?pred LIMIT 10`,
  },
  {
    id: 'Q6_join',
    description: 'Agents who asserted facts about the same subjects as agent a3 (2-hop star join)',
    feature: 'multi-pattern join, DISTINCT',
    sparql: `${PREFIXES}SELECT DISTINCT ?other WHERE {
  ?f1 prov:wasAttributedTo <${agentIri(3)}> ; sx:subject ?e .
  ?f2 sx:subject ?e ; prov:wasAttributedTo ?other .
  FILTER(?other != <${agentIri(3)}>)
}`,
  },
  {
    id: 'Q7_path',
    description: 'Transitive imports of one file (code-index style)',
    feature: 'property path +',
    sparql: `${PREFIXES}SELECT (COUNT(DISTINCT ?t) AS ?n) WHERE { <${fileIri(1500)}> deus:imports+ ?t }`,
  },
  {
    id: 'Q8_text',
    description: 'Facts whose quote mentions paris, from one agent',
    feature: 'string FILTER (CONTAINS)',
    sparql: `${PREFIXES}SELECT ?fact ?q WHERE { ?fact prov:wasAttributedTo <${agentIri(0)}> ; sx:quote ?q . FILTER(CONTAINS(?q, "paris")) }`,
  },
  {
    id: 'Q9_optional',
    description: 'Facts about an entity with optional speech-act force',
    feature: 'OPTIONAL, BOUND',
    sparql: `${PREFIXES}SELECT ?fact ?pred ?force WHERE {
  ?fact sx:subject <${entityIri(7)}> ; sx:predicate ?pred .
  OPTIONAL { ?fact sx:force ?force }
}`,
  },
  {
    id: 'Q10_count',
    description: 'Total triple count',
    feature: 'COUNT(*) over everything',
    sparql: `SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }`,
  },
];

export const queryById = (id: string): QueryDef => {
  const query = QUERIES.find((candidate) => candidate.id === id);
  if (!query) {
    throw new Error(`unknown query ${id}`);
  }
  return query;
};
