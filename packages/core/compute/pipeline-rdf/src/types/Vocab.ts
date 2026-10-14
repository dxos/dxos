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

/** The graph holding the brain's predicate metadata (labels, descriptions, synonyms). */
export const ONTOLOGY_GRAPH = `${GRAPH}ontology`;
export const RDF_TYPE = `${RDF}type`;
export const RDFS_LABEL = `${RDFS}label`;
export const RDFS_COMMENT = `${RDFS}comment`;
export const OWL_SAME_AS = `${OWL}sameAs`;
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

/** True for an absolute IRI (`did:key:…`, `echo://…`, `mailto:…`); entity slugs never contain `:`. */
export const isIri = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);

/** The node for an entity key: an absolute IRI as itself, a slug under {@link ENTITY}. */
export const entityNode = (key: string) => (isIri(key) ? namedNode(key) : entityIri(key));

/** Inverse of {@link entityNode}: the slug for an {@link ENTITY} IRI, any other IRI unchanged. */
export const entityKey = (iri: string): string => (iri.startsWith(ENTITY) ? entityIdFromIri(iri) : iri);

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
