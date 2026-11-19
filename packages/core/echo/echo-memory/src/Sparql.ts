//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import * as Fact from './Fact.ts';
import * as Mapping from './Mapping.ts';
import type * as MemoryQuery from './MemoryQuery.ts';
import * as Ontology from './Ontology.ts';
import * as Rdf from './Rdf.ts';
import type * as RdfStore from './RdfStore.ts';
import * as Vocab from './Vocab.ts';

//
// How a fact query becomes SPARQL over the stored layout (one named graph per provenance, its statements inside and
// its provenance about it in the default graph), and how solutions become quads and facts again. Shared by every store
// that keeps facts as quads, so they answer a query alike.
//

/** A fact query in its plain form. */
export type Pattern = Schema.Codec.Encoded<typeof MemoryQuery.FactQuery>;

/** A solution as an engine reports it: a variable it leaves unbound may be present as `undefined`. */
export type Row = Readonly<Record<string, MemoryQuery.SparqlTerm | undefined>>;

/** SPARQL IRIREF excludes these characters; a UCHAR escape keeps an arbitrary IRI or key from breaking the query. */
const iriRef = (iri: string): string =>
  `<${[...iri]
    .map((char) =>
      char <= ' ' || '<>"{}|^`\\'.includes(char) ? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}` : char,
    )
    .join('')}>`;

const ONTOLOGY = iriRef(Vocab.ONTOLOGY_GRAPH);

const KINDS = Mapping.KIND_CLASSES.map(iriRef).join(', ');

/** Excludes rows that are not statements: the ontology graph, and an entity's label or kind. */
const statementFilter = (graph: string, predicate: string, object: string) =>
  `FILTER(${graph} != ${ONTOLOGY} && ${predicate} != ${iriRef(Vocab.RDFS_LABEL)} && !(${predicate} = ${iriRef(Vocab.RDF_TYPE)} && ${object} IN (${KINDS})))`;

/** An entity key names its IRI exactly, and a slug also names the graph-local entity of that slug in every graph. */
const isEntity = (variable: string, key: string): string => {
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
  ontologyQuads: readonly Rdf.Quad[],
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
export const candidateGraphs = (query: Pattern, predicates?: ReadonlySet<string>): string => {
  const patterns: string[] = [];
  if (query.subjectEntity) {
    patterns.push(
      `{ GRAPH ?g { ?ss ?sp ?so } ${statementFilter('?g', '?sp', '?so')} FILTER(${isEntity('?ss', query.subjectEntity)}) }`,
    );
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
    patterns.push(
      `{ GRAPH ?g { ?es ?ep ?eo } ${statementFilter('?g', '?ep', '?eo')} FILTER(${isEntity('?es', query.entity)} || ${isEntity('?eo', query.entity)}) }`,
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

/** Whether one relation key's words occur, in order and whole, in another's: `is a` (key `a`) is not in `work_at`. */
const contains = (haystack: string, needle: string): boolean => {
  const words = haystack.split('_');
  const sought = needle.split('_');
  return words.some((_, start) => sought.every((word, offset) => words[start + offset] === word));
};

/**
 * The stored predicates a query's predicate names: those its surface form resolves to through the ontology, and
 * those whose label or synonyms share its relation key, either way round, since a model rarely reproduces the
 * stored phrase verbatim.
 */
export const matchingPredicates = (
  surface: string,
  predicates: ReadonlyMap<string, string>,
  ontology: Ontology.Ontology = Ontology.DEFAULT,
): Set<string> => {
  if (Vocab.isIri(surface)) {
    return ontology.equivalents(surface);
  }
  const needle = Ontology.key(surface);
  const matches = new Set([ontology.resolve(surface).iri]);
  for (const [iri, label] of predicates) {
    const entry = ontology.get(iri);
    const keys = [label, ...(entry ? [entry.name, ...(entry.synonyms ?? [])] : [])].map(Ontology.key);
    if (keys.some((key) => contains(key, needle) || contains(needle, key))) {
      matches.add(iri);
    }
  }
  // Merged predicates match each other, so statements made before a merge still answer.
  return new Set([...matches].flatMap((iri) => [...ontology.equivalents(iri)]));
};

/**
 * Whether a statement satisfies the query. Candidate graphs are found by any statement in them, so each statement
 * is checked again here: a graph about Rich may also hold a statement about DXOS.
 */
export const statementMatches = (fact: Fact.Fact, query: Pattern, predicates?: ReadonlySet<string>): boolean => {
  const subject = Fact.termValue(fact.assertion.subject);
  const object = Fact.termValue(fact.assertion.object);
  return (
    (query.subjectEntity === undefined || subject === query.subjectEntity) &&
    (query.entity === undefined ||
      subject === query.entity ||
      (fact.assertion.object.kind === 'entity' && object === query.entity)) &&
    (predicates === undefined || predicates.has(fact.assertion.predicateIri ?? '')) &&
    (query.source === undefined || fact.attribution.source === query.source) &&
    (query.minConfidence === undefined || (fact.factuality.confidence ?? 0) >= query.minConfidence)
  );
};

const { blankNode, defaultGraph, literal, namedNode, quad } = Rdf;

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

/** RDF/JS term → the engine's plain-data term. */
export const toTerm = (term: Rdf.Term): MemoryQuery.SparqlTerm => {
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
export const toQuad = (triple: Rdf.Quad): RdfStore.Quad => ({
  s: toTerm(triple.subject),
  p: toTerm(triple.predicate),
  o: toTerm(triple.object),
  ...(triple.graph.termType === 'DefaultGraph' ? {} : { g: toTerm(triple.graph) }),
});

const toResource = (term: MemoryQuery.SparqlTerm) =>
  term.termType === 'BlankNode' ? blankNode(term.value) : namedNode(term.value);

const toObject = (term: MemoryQuery.SparqlTerm) =>
  term.termType === 'Literal'
    ? literal(term.value, term.language ?? (term.datatype ? namedNode(term.datatype) : undefined))
    : toResource(term);

/**
 * `?g ?s ?p ?o` solutions as quads: a row with `?s` bound is a quad in graph `?g`, one without it is a default-graph
 * triple about `?g` (its provenance). Rows with a literal in a resource position are skipped.
 */
export const rowsToQuads = (rows: readonly Row[]): Rdf.Quad[] =>
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
