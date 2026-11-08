//
// Copyright 2026 DXOS.org
//

import { type Quad } from 'n3';

import * as Mapping from '../../types/Mapping.ts';
import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type SemanticQuery } from './query-builder.ts';

/** SPARQL IRIREF excludes these characters; a UCHAR escape keeps an arbitrary IRI or key from breaking the query. */
export const iriRef = (iri: string): string =>
  `<${[...iri]
    .map((char) =>
      char <= ' ' || '<>"{}|^`\\'.includes(char) ? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}` : char,
    )
    .join('')}>`;

export const ONTOLOGY = iriRef(Vocab.ONTOLOGY_GRAPH);

export const PROV_DERIVED_FROM = iriRef(`${Vocab.PROV}wasDerivedFrom`);
const SX_CONFIDENCE = iriRef(`${Vocab.SX}confidence`);
const SX_SUPERSEDES = iriRef(`${Vocab.SX}supersedes`);
const SX_RETRACTS = iriRef(`${Vocab.SX}retracts`);
/** Spelled in full rather than via a prefix, so a pattern carries no declaration requirement to its caller. */
const XSD_DECIMAL = '<http://www.w3.org/2001/XMLSchema#decimal>';

/** Every graph that still stands: nothing supersedes or retracts it. */
export const STANDING_FILTER = [
  `FILTER NOT EXISTS { ?replacement ${SX_SUPERSEDES} ?g }`,
  `FILTER NOT EXISTS { ?withdrawal ${SX_RETRACTS} ?g }`,
];

/**
 * `?g`'s confidence against a floor, reading an unstated confidence as zero — as the in-memory backend does
 * (`confidence ?? 0`). A floor of zero or less is therefore no constraint at all, and above zero no unscored
 * graph can clear it, so requiring the triple is exact. (Stated as two cases rather than one `COALESCE`, whose
 * arms the compiler would reject as mixed-type.)
 */
export const confidenceFilter = (minConfidence: number): string[] => {
  if (!Number.isFinite(minConfidence)) {
    throw new TypeError('minConfidence must be a finite number.');
  }
  return minConfidence <= 0 ? [] : [`?g ${SX_CONFIDENCE} ?conf .`, `FILTER(${XSD_DECIMAL}(?conf) >= ${minConfidence})`];
};

const KINDS = Mapping.KIND_CLASSES.map(iriRef).join(', ');

/** Excludes rows that are not statements: the ontology graph, and an entity's label or kind. */
export const statementFilter = (graph: string, predicate: string, object: string) =>
  `FILTER(${graph} != ${ONTOLOGY} && ${predicate} != ${iriRef(Vocab.RDFS_LABEL)} && !(${predicate} = ${iriRef(Vocab.RDF_TYPE)} && ${object} IN (${KINDS})))`;

/** An entity key names its IRI exactly, and a slug also names the graph-local entity of that slug in every graph. */
export const isEntity = (variable: string, key: string): string => {
  const node = iriRef(Vocab.entityNode(key).value);
  return Vocab.isIri(key)
    ? `${variable} = ${node}`
    : `(${variable} = ${node} || (isIRI(${variable}) && STRENDS(STR(${variable}), ${JSON.stringify(Vocab.localEntitySuffix(key))})))`;
};

/** Every quad of the ontology graph (predicate labels), as `?g ?s ?p ?o`. */
export const ONTOLOGY_SPARQL = `SELECT ?g ?s ?p ?o WHERE { VALUES ?g { ${ONTOLOGY} } GRAPH ?g { ?s ?p ?o } }`;

/** The distinct predicates of every stored statement. */
export const STORED_PREDICATES_SPARQL = `SELECT DISTINCT ?p WHERE { GRAPH ?g { ?s ?p ?o } ${statementFilter('?g', '?p', '?o')} }`;

/** Every predicate the ontology graph already describes as an `rdf:Property`. */
export const DESCRIBED_PREDICATES_SPARQL = `SELECT DISTINCT ?s WHERE { GRAPH ${ONTOLOGY} { ?s ${iriRef(Vocab.RDF_TYPE)} ${iriRef(Vocab.RDF_PROPERTY)} } }`;

/** The seed-version marker, kept in the default graph about the ontology graph. */
export const SEED_MARKER_SPARQL = `SELECT ?v WHERE { ${ONTOLOGY} ${iriRef(Vocab.SX_SEED)} ?v }`;

/** SPARQL UPDATEs removing the seed marker and the ontology-graph description of each of `iris`, one per request. */
export const deleteSeedSparql = (iris: readonly string[]): string[] => [
  `DELETE WHERE { ${ONTOLOGY} ${iriRef(Vocab.SX_SEED)} ?v }`,
  ...iris.map((iri) => `DELETE WHERE { GRAPH ${ONTOLOGY} { ${iriRef(iri)} ?p ?o } }`),
];

/** The label of each stored predicate: from the ontology graph, else the ontology, else its IRI. */
export const predicateLabels = (
  stored: Iterable<string>,
  ontologyQuads: readonly Quad[],
  ontology: Ontology.Ontology = Ontology.DEFAULT,
): Map<string, string> => {
  const labels = new Map<string, string>();
  for (const quad of ontologyQuads) {
    if (quad.predicate.value === Vocab.RDFS_LABEL && !labels.has(quad.subject.value)) {
      labels.set(quad.subject.value, quad.object.value);
    }
  }
  return new Map(
    [...stored].map((iri) => [iri, labels.get(iri) ?? ontology.get(iri)?.label ?? Ontology.labelFromIri(iri)]),
  );
};

/** The statement variables a pattern set binds. The aggregate needs `?s ?p ?o`, since it groups on them. */
export type StatementVars = { readonly subject: string; readonly predicate: string; readonly object: string };

const DEFAULT_VARS: StatementVars = { subject: '?s', predicate: '?p', object: '?o' };

/**
 * Patterns matching a query against ONE statement — every constraint applies to the same `?s ?p ?o` in the same
 * `?g`, so a graph qualifies only if a single statement in it satisfies all of them. Binding the constraints
 * separately would admit a graph that has the subject on one statement and the predicate on another, which no
 * fact in it matches; whether that costs anything depends on who is asking (see {@link candidateGraphs}).
 *
 * `source`, `minConfidence` and `current` describe the graph rather than the statement, which is where the
 * provenance lives.
 */
export const statementPatterns = (
  query: SemanticQuery,
  predicates?: ReadonlySet<string>,
  vars: StatementVars = DEFAULT_VARS,
): string[] => {
  const { subject, predicate, object } = vars;
  const patterns = [`GRAPH ?g { ${subject} ${predicate} ${object} }`, statementFilter('?g', predicate, object)];
  if (query.subjectEntity) {
    patterns.push(`FILTER(${isEntity(subject, query.subjectEntity)})`);
  }
  if (predicates) {
    patterns.push(`FILTER(${predicate} IN (${[...predicates].map(iriRef).join(', ')}))`);
  }
  if (query.entity) {
    patterns.push(`FILTER(${isEntity(subject, query.entity)} || ${isEntity(object, query.entity)})`);
  }
  if (query.source) {
    patterns.push(`?g ${PROV_DERIVED_FROM} ${JSON.stringify(query.source)} .`);
  }
  if (query.minConfidence !== undefined) {
    patterns.push(...confidenceFilter(query.minConfidence));
  }
  if (query.current) {
    patterns.push(...STANDING_FILTER);
  }
  return patterns;
};

/** Its own variables, so nothing it binds can be confused with the statement {@link graphQuadsSparql} selects. */
const CANDIDATE_VARS: StatementVars = { subject: '?cs', predicate: '?cp', object: '?co' };

/**
 * Group pattern binding `?g` to every named graph holding a statement that matches the query. The constraints
 * all apply to one statement ({@link statementPatterns}), which is what makes this the right basis for
 * {@link graphQuadsSparql}'s `limit`: every graph the cap admits holds a matching fact, so a capped read is a
 * window on the facts that match rather than on the graphs scanned to find them.
 *
 * The caller still re-checks each reassembled statement (`statementMatches`), because whole graphs are loaded to
 * reassemble facts and a qualifying graph may hold other statements that do not match.
 */
export const candidateGraphs = (query: SemanticQuery, predicates?: ReadonlySet<string>): string =>
  statementPatterns(query, predicates, CANDIDATE_VARS).join('\n');

/** Group pattern binding `?g` to exactly the given graph IRIs. */
export const graphValues = (graphs: readonly string[]): string => `VALUES ?g { ${graphs.map(iriRef).join(' ')} }`;

/**
 * SPARQL loading every quad of the graphs `candidates` binds, as `?g ?s ?p ?o`, and each graph's provenance from
 * the default graph, as `?g ?p ?o` with `?s` unbound. A `limit` caps the graphs loaded, ordered by IRI so the
 * capped set is the same for the same store rather than whichever rows the planner reached first.
 */
export const graphQuadsSparql = (candidates: string, limit?: number): string => {
  const cap = limit === undefined ? '' : ` ORDER BY ?g LIMIT ${Math.max(0, Math.trunc(limit))}`;
  return `SELECT ?g ?s ?p ?o WHERE { { SELECT DISTINCT ?g WHERE { ${candidates} }${cap} } { GRAPH ?g { ?s ?p ?o } } UNION { ?g ?p ?o } }`;
};
