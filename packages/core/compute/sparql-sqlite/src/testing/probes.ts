//
// Copyright 2026 DXOS.org
//

import { agentIri, entityIri, factIri, fileIri } from './gen.ts';
import { PREFIXES } from './queries.ts';

/**
 * SPARQL 1.1 capability probes, run against the 1000-fact dataset (`--probes`) via POST /sparql.
 * A probe passes when it returns the oracle's row count and checksum. SELECT only: the harness
 * returns solution rows (ASK/CONSTRUCT are expressed as SELECT equivalents where possible).
 */
export const PROBES: { id: string; sparql: string }[] = [
  {
    id: 'bgp_star',
    sparql: `${PREFIXES}SELECT ?f ?p ?c WHERE { ?f sx:subject <${entityIri(0)}> ; sx:predicate ?p ; sx:confidence ?c }`,
  },
  {
    id: 'optional',
    sparql: `${PREFIXES}SELECT ?f ?force WHERE { ?f sx:subject <${entityIri(0)}> OPTIONAL { ?f sx:force ?force } }`,
  },
  {
    id: 'union',
    sparql: `${PREFIXES}SELECT ?f WHERE { { ?f sx:subject <${entityIri(2)}> } UNION { ?f sx:object <${entityIri(2)}> } }`,
  },
  {
    id: 'minus',
    sparql: `${PREFIXES}SELECT ?f WHERE { ?f sx:subject <${entityIri(0)}> MINUS { ?f sx:force "directive" } }`,
  },
  {
    id: 'not_exists',
    sparql: `${PREFIXES}SELECT ?f WHERE { ?f sx:subject <${entityIri(0)}> FILTER NOT EXISTS { ?f sx:force ?x } }`,
  },
  {
    id: 'filter_regex',
    sparql: `${PREFIXES}SELECT ?f WHERE { ?f sx:quote ?q FILTER(REGEX(?q, "^the (paris|rome)", "i")) }`,
  },
  {
    id: 'filter_lang_str',
    sparql: `${PREFIXES}SELECT ?f WHERE { ?f sx:predicate ?p FILTER(STRSTARTS(STR(?p), "verb1") && STRLEN(?p) = 6) }`,
  },
  {
    id: 'filter_numeric',
    sparql: `${PREFIXES}SELECT ?f WHERE { ?f sx:confidence ?c FILTER(?c > 0.5 && ?c * 2 < 1.2) }`,
  },
  {
    id: 'filter_date',
    sparql: `${PREFIXES}SELECT ?f WHERE { ?f prov:generatedAtTime ?t FILTER(YEAR(?t) = 2026 && MONTH(?t) = 1 && DAY(?t) = 2) }`,
  },
  {
    id: 'bind_concat',
    sparql: `${PREFIXES}SELECT ?f ?label WHERE { ?f sx:subject <${entityIri(1)}> ; sx:predicate ?p BIND(CONCAT(?p, "!") AS ?label) }`,
  },
  {
    id: 'values',
    sparql: `${PREFIXES}SELECT ?f ?e WHERE { VALUES ?e { <${entityIri(0)}> <${entityIri(1)}> } ?f sx:subject ?e }`,
  },
  {
    id: 'agg_having',
    sparql: `${PREFIXES}SELECT ?a (COUNT(*) AS ?n) (AVG(?c) AS ?avg) WHERE { ?f prov:wasAttributedTo ?a ; sx:confidence ?c } GROUP BY ?a HAVING(COUNT(*) > 20)`,
  },
  {
    id: 'agg_group_concat',
    sparql: `${PREFIXES}SELECT ?f (GROUP_CONCAT(?p; separator=",") AS ?ps) WHERE { <${factIri(5)}> ?p ?o BIND(<${factIri(5)}> AS ?f) } GROUP BY ?f`,
  },
  {
    id: 'subquery_limit',
    sparql: `${PREFIXES}SELECT ?f ?q WHERE { { SELECT ?f WHERE { ?f sx:subject <${entityIri(0)}> } ORDER BY ?f LIMIT 3 } ?f sx:quote ?q }`,
  },
  {
    id: 'order_offset',
    sparql: `${PREFIXES}SELECT ?f ?t WHERE { ?f prov:generatedAtTime ?t } ORDER BY DESC(?t) LIMIT 5 OFFSET 10`,
  },
  {
    id: 'path_seq',
    sparql: `${PREFIXES}SELECT ?a WHERE { <${factIri(9)}> sx:subject/^sx:subject/prov:wasAttributedTo ?a }`,
  },
  {
    id: 'path_alt_star',
    sparql: `${PREFIXES}SELECT ?x WHERE { <${entityIri(0)}> (^sx:subject|^sx:object)/sx:predicate* ?x }`,
  },
  { id: 'graph_named', sparql: `${PREFIXES}SELECT ?g (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?g` },
  { id: 'var_predicate', sparql: `${PREFIXES}SELECT DISTINCT ?p WHERE { ?s ?p <${agentIri(0)}> }` },
  {
    id: 'exists_count',
    sparql: `${PREFIXES}SELECT (COUNT(DISTINCT ?e) AS ?n) WHERE { ?f sx:object ?e FILTER(isIRI(?e)) }`,
  },
  { id: 'file_path_unused', sparql: `${PREFIXES}SELECT ?f WHERE { ?f a deus:File } LIMIT 1` },
  { id: 'unbound_iri', sparql: `${PREFIXES}SELECT ?p ?o WHERE { <${fileIri(1)}> ?p ?o }` },
];
