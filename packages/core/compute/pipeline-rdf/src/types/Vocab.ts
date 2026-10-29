//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

/** Semantic-index vocabulary (provenance and factuality predicates). */
export const SX = 'https://dxos.org/semantic#';
/** W3C PROV-O. */
export const PROV = 'http://www.w3.org/ns/prov#';
/** Entity IRI prefix. */
export const ENTITY = 'https://dxos.org/semantic/entity/';
/** Fact-node IRI prefix; a stored fact without an explicit graph is the graph of this IRI. */
export const FACT = 'https://dxos.org/semantic/fact/';
/** Named-graph IRI prefix for graphs the extractor names. */
export const GRAPH = 'https://dxos.org/semantic/graph/';
/** Ontology namespace: predicates and entity classes. */
export const DX = 'https://dxos.org/ontology/';
export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
export const OWL = 'http://www.w3.org/2002/07/owl#';
export const XSD = 'http://www.w3.org/2001/XMLSchema#';
export const SKOS = 'http://www.w3.org/2004/02/skos/core#';
export const DCTERMS = 'http://purl.org/dc/terms/';
export const SCHEMA = 'https://schema.org/';
export const FOAF = 'http://xmlns.com/foaf/0.1/';
export const ORG = 'http://www.w3.org/ns/org#';
/** Brain namespaces: each brain mints the predicates its extractors invent under its own IRI. */
export const BRAIN = 'https://dxos.org/semantic/brain/';

/** The graph holding the brain's predicate metadata (labels, descriptions, synonyms). */
export const ONTOLOGY_GRAPH = `${GRAPH}ontology`;
export const RDF_TYPE = `${RDF}type`;
export const RDFS_LABEL = `${RDFS}label`;
export const RDFS_COMMENT = `${RDFS}comment`;
export const RDFS_DOMAIN = `${RDFS}domain`;
export const RDFS_RANGE = `${RDFS}range`;
export const RDFS_IS_DEFINED_BY = `${RDFS}isDefinedBy`;
export const RDF_PROPERTY = `${RDF}Property`;
export const OWL_SAME_AS = `${OWL}sameAs`;
export const OWL_INVERSE_OF = `${OWL}inverseOf`;
export const OWL_EQUIVALENT_PROPERTY = `${OWL}equivalentProperty`;
export const OWL_DEPRECATED = `${OWL}deprecated`;
export const SKOS_ALT_LABEL = `${SKOS}altLabel`;
export const SKOS_EXAMPLE = `${SKOS}example`;
export const DCTERMS_CREATED = `${DCTERMS}created`;
export const DCTERMS_CREATOR = `${DCTERMS}creator`;
export const DCTERMS_IS_REPLACED_BY = `${DCTERMS}isReplacedBy`;
/** The version of the seed vocabulary a store holds, stated about the ontology graph. */
export const SX_SEED = `${SX}seed`;
/** The shorthand rules use for a predicate (`member_of`). */
export const SX_SHORTHAND = `${SX}shorthand`;
/** The class of every stored graph, so an unconstrained query can enumerate them. */
export const SX_GRAPH = `${SX}Graph`;

/** Named node in the `sx:` namespace. */
export const sx = (name: string) => namedNode(SX + name);
/** Named node in the `prov:` namespace. */
export const prov = (name: string) => namedNode(PROV + name);
/** IRI for an entity id. */
export const entityIri = (id: string) => namedNode(ENTITY + encodeURIComponent(id));
/** IRI for a fact id. */
export const factIri = (id: string) => namedNode(FACT + encodeURIComponent(id));
/** IRI for a named graph. */
export const graphIri = (name: string) => namedNode(GRAPH + encodeURIComponent(name));
/** Named node in the `dx:` namespace. */
export const dx = (name: string) => namedNode(DX + name);

/** The namespace a brain mints its predicates under. */
export const brainNamespace = (id: string): string => `${BRAIN}${encodeURIComponent(id)}/`;

/** The brain namespace an IRI was minted in, if it was minted in one. */
export const brainNamespaceOf = (iri: string): string | undefined => {
  if (!iri.startsWith(BRAIN)) {
    return undefined;
  }
  const end = iri.indexOf('/', BRAIN.length);
  return end === -1 ? undefined : iri.slice(0, end + 1);
};

/** The namespace of a brain that has no id of its own (a preview, a test). */
export const LOCAL_BRAIN = brainNamespace('local');

/**
 * IRI of an entity the extractor named but could not resolve: local to the graph that mentions it, since a label
 * alone does not say that two graphs mean the same thing.
 */
export const localEntityIri = (graph: string, id: string) => namedNode(`${graph}#${encodeURIComponent(id)}`);

/** The slug of a graph-local entity IRI (see {@link localEntityIri}), if it is one of `graph`'s. */
export const localEntityId = (graph: string, iri: string): string | undefined =>
  iri.startsWith(`${graph}#`) ? decodeURIComponent(iri.slice(graph.length + 1)) : undefined;

/** The suffix every graph-local IRI of an entity slug ends with, whichever graph it is local to. */
export const localEntitySuffix = (id: string): string => `#${encodeURIComponent(id)}`;

/** True for an absolute IRI (`did:key:...`, `echo://...`, `mailto:...`); entity slugs never contain `:`. */
export const isIri = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);

/** The node for an entity key: an absolute IRI as itself, a slug local to `graph` (under {@link ENTITY} when none). */
export const entityNode = (key: string, graph?: string) =>
  isIri(key) ? namedNode(key) : graph !== undefined ? localEntityIri(graph, key) : entityIri(key);

/** Inverse of {@link entityNode}: the slug for an IRI local to `graph` or under {@link ENTITY}, any other IRI unchanged. */
export const entityKey = (iri: string, graph?: string): string =>
  (graph !== undefined ? localEntityId(graph, iri) : undefined) ??
  (iri.startsWith(ENTITY) ? entityIdFromIri(iri) : iri);

/** Plain string literal. */
export const str = (value: string) => literal(value);
/** Inverse of {@link entityIri}; throws on a non-entity IRI. */
export const entityIdFromIri = (iri: string) => {
  if (!iri.startsWith(ENTITY)) {
    throw new TypeError(`Expected entity IRI with prefix ${ENTITY}: ${iri}`);
  }
  return decodeURIComponent(iri.slice(ENTITY.length));
};

/** Inverse of {@link factIri}; throws on a non-fact IRI. */
export const factIdFromIri = (iri: string) => {
  if (!iri.startsWith(FACT)) {
    throw new TypeError(`Expected fact IRI with prefix ${FACT}: ${iri}`);
  }
  return decodeURIComponent(iri.slice(FACT.length));
};
