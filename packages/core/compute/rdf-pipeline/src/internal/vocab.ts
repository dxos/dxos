//
// Copyright 2026 DXOS.org
//

import { DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
export const JSONLD = 'https://www.w3.org/ns/json-ld#';
export const ECHO = 'https://dxos.org/echo#';

export const rdf = (name: string) => namedNode(RDF + name);
export const rdfs = (name: string) => namedNode(RDFS + name);
export const echo = (name: string) => namedNode(ECHO + name);
export const str = (value: string) => literal(value);

export const entitySubject = (entityId: string) => namedNode(`echo:/${entityId}`);

export const entityIdFromSubject = (iri: string): string | undefined => {
  if (!iri.startsWith('echo:/')) {
    return undefined;
  }
  return iri.slice('echo:/'.length);
};
