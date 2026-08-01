//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

export const SX = 'https://dxos.org/semantic#';
export const PROV = 'http://www.w3.org/ns/prov#';
export const ENTITY = 'https://dxos.org/semantic/entity/';
export const FACT = 'https://dxos.org/semantic/fact/';

export const sx = (name: string) => namedNode(SX + name);
export const prov = (name: string) => namedNode(PROV + name);
export const entityIri = (id: string) => namedNode(ENTITY + encodeURIComponent(id));
export const factIri = (id: string) => namedNode(FACT + encodeURIComponent(id));

export const str = (value: string) => literal(value);
export const entityIdFromIri = (iri: string) => {
  if (!iri.startsWith(ENTITY)) {
    throw new TypeError(`Expected entity IRI with prefix ${ENTITY}: ${iri}`);
  }
  return decodeURIComponent(iri.slice(ENTITY.length));
};

export const factIdFromIri = (iri: string) => {
  if (!iri.startsWith(FACT)) {
    throw new TypeError(`Expected fact IRI with prefix ${FACT}: ${iri}`);
  }
  return decodeURIComponent(iri.slice(FACT.length));
};
