//
// Copyright 2026 DXOS.org
//

import { type Quad } from 'n3';

import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type SemanticQuery } from './query-builder.ts';

/** SPARQL IRIREF excludes these characters; a UCHAR escape keeps an arbitrary IRI or key from breaking the query. */
const iriRef = (iri: string): string =>
  `<${[...iri]
    .map((char) =>
      char <= ' ' || '<>"{}|^`\\'.includes(char) ? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}` : char,
    )
    .join('')}>`;

const ONTOLOGY = iriRef(Vocab.ONTOLOGY_GRAPH);

/** Excludes rows that are not statements: the ontology graph, and an entity's label or kind. */
const statementFilter = (graph: string, predicate: string) =>
  `FILTER(${graph} != ${ONTOLOGY} && ${predicate} NOT IN (${iriRef(Vocab.RDFS_LABEL)}, ${iriRef(Vocab.RDF_TYPE)}))`;

/** Every quad of the ontology graph (predicate labels), as `?g ?s ?p ?o`. */
export const ONTOLOGY_SPARQL = `SELECT ?g ?s ?p ?o WHERE { VALUES ?g { ${ONTOLOGY} } GRAPH ?g { ?s ?p ?o } }`;

/** The distinct predicates of every stored statement. */
export const STORED_PREDICATES_SPARQL = `SELECT DISTINCT ?p WHERE { GRAPH ?g { ?s ?p ?o } ${statementFilter('?g', '?p')} }`;

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

/**
 * Group pattern binding `?g` to every named graph holding a statement that matches each of the query's
 * constraints, with `predicates` the IRIs its predicate names. Confidence is not a constraint here: the caller
 * re-checks every statement (`statementMatches`).
 */
export const candidateGraphs = (query: SemanticQuery, predicates?: ReadonlySet<string>): string => {
  const patterns: string[] = [];
  if (query.subjectEntity) {
    const node = iriRef(Vocab.entityNode(query.subjectEntity).value);
    patterns.push(`{ GRAPH ?g { ${node} ?sp ?so } ${statementFilter('?g', '?sp')} }`);
  }
  if (predicates) {
    patterns.push(
      `{ GRAPH ?g { ?ps ?pp ?po } FILTER(?g != ${ONTOLOGY} && ?pp IN (${[...predicates].map(iriRef).join(', ')})) }`,
    );
  }
  if (query.source) {
    patterns.push(`?g ${iriRef(`${Vocab.PROV}wasDerivedFrom`)} ${JSON.stringify(query.source)} .`);
  }
  if (query.entity) {
    const node = iriRef(Vocab.entityNode(query.entity).value);
    patterns.push(
      `{ { GRAPH ?g { ${node} ?ep ?eo } } UNION { GRAPH ?g { ?es ?ep ${node} } } ${statementFilter('?g', '?ep')} }`,
    );
  }
  return patterns.length === 0 ? `?g ${iriRef(Vocab.RDF_TYPE)} ${iriRef(Vocab.SX_GRAPH)} .` : patterns.join('\n');
};

/** Group pattern binding `?g` to exactly the given graph IRIs. */
export const graphValues = (graphs: readonly string[]): string => `VALUES ?g { ${graphs.map(iriRef).join(' ')} }`;

/**
 * SPARQL loading every quad of the graphs `candidates` binds, as `?g ?s ?p ?o`, and each graph's provenance from
 * the default graph, as `?g ?p ?o` with `?s` unbound.
 */
export const graphQuadsSparql = (candidates: string): string =>
  `SELECT ?g ?s ?p ?o WHERE { { SELECT DISTINCT ?g WHERE { ${candidates} } } { GRAPH ?g { ?s ?p ?o } } UNION { ?g ?p ?o } }`;
