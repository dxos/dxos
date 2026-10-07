//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

/** Semantic-index vocabulary (fact reification predicates). */
export const SX = 'https://dxos.org/semantic#';
/** W3C PROV-O. */
export const PROV = 'http://www.w3.org/ns/prov#';
/** Entity IRI prefix. */
export const ENTITY = 'https://dxos.org/semantic/entity/';
/** Fact-node IRI prefix. */
export const FACT = 'https://dxos.org/semantic/fact/';

/** Named node in the `sx:` namespace. */
export const sx = (name: string) => namedNode(SX + name);
/** Named node in the `prov:` namespace. */
export const prov = (name: string) => namedNode(PROV + name);
/** IRI for an entity id. */
export const entityIri = (id: string) => namedNode(ENTITY + encodeURIComponent(id));
/** IRI for a fact id. */
export const factIri = (id: string) => namedNode(FACT + encodeURIComponent(id));

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
