//
// Copyright 2026 DXOS.org
//

import { Entity } from '@dxos/echo';
import { isEncodedReference } from '@dxos/echo-protocol';
import { EID } from '@dxos/keys';
import { DataFactory, type Quad, type NamedNode, type Literal } from 'n3';

import type * as EntityModule from '@dxos/echo/Entity';

import { entitySubject, entityIdFromSubject, rdf, echo, str, ECHO } from './vocab';

const { quad, namedNode, literal, defaultGraph } = DataFactory;

const graph = defaultGraph();

const INTERNAL_KEYS = new Set([
  '@type',
  '@meta',
  '@deleted',
  '@parent',
  '@relationSource',
  '@relationTarget',
  '@self',
]);

type EntityJson = EntityModule.JSON;

const refToNode = (value: { '/': string }): NamedNode => {
  const dxn = value['/'];
  if (dxn.startsWith('echo:') || dxn.startsWith('dxn:')) {
    try {
      const parsed = EID.tryParse(dxn);
      if (parsed) {
        return entitySubject(EID.getEntityId(parsed)!);
      }
    } catch {
      // Fall through to named node for non-ECHO refs.
    }
  }
  return namedNode(dxn);
};

/** Map a plain JS value to RDF term(s) that can appear in object position of a quad. */
const valueToTerms = (value: unknown): (NamedNode | Literal)[] => {
  if (value === null || value === undefined) {
    return [];
  }
  if (isEncodedReference(value)) {
    return [refToNode(value)];
  }
  if (typeof value === 'boolean') {
    return [literal(String(value), namedNode('http://www.w3.org/2001/XMLSchema#boolean'))];
  }
  if (typeof value === 'number') {
    return [literal(String(value), namedNode('http://www.w3.org/2001/XMLSchema#decimal'))];
  }
  if (typeof value === 'string') {
    return [str(value)];
  }
  if (value instanceof Uint8Array) {
    let binary = '';
    for (const byte of value) {
      binary += String.fromCharCode(byte);
    }
    return [literal(btoa(binary), namedNode('http://www.w3.org/2001/XMLSchema#base64Binary'))];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => valueToTerms(item));
  }
  if (typeof value === 'object') {
    return [literal(JSON.stringify(value), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON'))];
  }
  return [str(String(value))];
};

/** Expand an ECHO entity JSON document into plain RDF quads. */
export const entityJsonToQuads = (json: EntityJson): Quad[] => {
  const subject = entitySubject(json.id);
  const quads: Quad[] = [];

  if (json['@type']) {
    quads.push(quad(subject, rdf('type'), namedNode(String(json['@type'])), graph));
  }

  for (const [key, value] of Object.entries(json)) {
    if (key === 'id' || INTERNAL_KEYS.has(key) || value === undefined) {
      continue;
    }
    for (const object of valueToTerms(value)) {
      quads.push(quad(subject, echo(key), object, graph));
    }
  }

  if (json['@meta']) {
    quads.push(quad(subject, echo('@meta'), str(JSON.stringify(json['@meta'])), graph));
  }
  if (json['@deleted']) {
    quads.push(quad(subject, echo('@deleted'), str('true'), graph));
  }
  if (json['@parent']) {
    for (const object of valueToTerms(json['@parent'])) {
      quads.push(quad(subject, echo('@parent'), object, graph));
    }
  }
  if (json['@relationSource']) {
    for (const object of valueToTerms(json['@relationSource'])) {
      quads.push(quad(subject, echo('@relationSource'), object, graph));
    }
  }
  if (json['@relationTarget']) {
    for (const object of valueToTerms(json['@relationTarget'])) {
      quads.push(quad(subject, echo('@relationTarget'), object, graph));
    }
  }

  return quads;
};

/** Convert live entities to RDF quads using {@link Entity.toJSON}. */
export const entitiesToQuads = (entities: readonly EntityModule.Unknown[]): Quad[] =>
  entities.flatMap((entity) => entityJsonToQuads(Entity.toJSON(entity)));

const termToJsonValue = (term: NamedNode | Literal | { termType: string; value: string }): unknown => {
  if (term.termType === 'Literal') {
    const lit = term as Literal;
    if (lit.datatype?.value === 'http://www.w3.org/2001/XMLSchema#boolean') {
      return lit.value === 'true';
    }
    if (lit.datatype?.value === 'http://www.w3.org/2001/XMLSchema#decimal') {
      return Number(lit.value);
    }
    if (lit.datatype?.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON') {
      return JSON.parse(lit.value);
    }
    return lit.value;
  }
  if (term.termType === 'NamedNode') {
    const entityId = entityIdFromSubject(term.value);
    if (entityId) {
      return { '/': EID.make({ entityId }) };
    }
    return term.value;
  }
  return term.value;
};

const localName = (iri: string) => iri.replace(/^.*[#/]/, '');

/** Reconstruct entity JSON documents from RDF quads keyed by `echo:/` subjects. */
export const quadsToEntityJson = (quads: readonly Quad[]): EntityJson[] => {
  const bySubject = new Map<string, Map<string, Array<NamedNode | Literal | { termType: string; value: string }>>>();

  for (const q of quads) {
    if (q.subject.termType !== 'NamedNode') {
      continue;
    }
    const entityId = entityIdFromSubject(q.subject.value);
    if (!entityId) {
      continue;
    }
    let props = bySubject.get(entityId);
    if (!props) {
      bySubject.set(entityId, (props = new Map()));
    }
    const name = localName(q.predicate.value);
    const terms = props.get(name);
    if (terms) {
      terms.push(q.object as NamedNode | Literal);
    } else {
      props.set(name, [q.object as NamedNode | Literal]);
    }
  }

  const entities: EntityJson[] = [];
  for (const [entityId, props] of bySubject) {
    const typeTerm = props.get('type')?.[0];
    const json: Record<string, unknown> = { id: entityId };

    if (typeTerm?.termType === 'NamedNode') {
      json['@type'] = typeTerm.value;
    }

    for (const [name, terms] of props) {
      if (name === 'type') {
        continue;
      }
      const values = terms.map(termToJsonValue);
      if (name === '@meta' && values[0] !== undefined) {
        json['@meta'] = typeof values[0] === 'string' ? JSON.parse(values[0] as string) : values[0];
        continue;
      }
      json[name] = values.length === 1 ? values[0] : values;
    }

    entities.push(json as EntityJson);
  }

  return entities;
};

/** Keep only quads whose subject belongs to entities matching the given type IRIs. */
export const filterQuadsByTypenames = (quads: readonly Quad[], typenames: ReadonlySet<string>): Quad[] => {
  const subjects = new Set<string>();
  for (const q of quads) {
    if (q.predicate.value === rdf('type').value && q.object.termType === 'NamedNode' && typenames.has(q.object.value)) {
      subjects.add(q.subject.value);
    }
  }
  return quads.filter((q) => q.subject.termType === 'NamedNode' && subjects.has(q.subject.value));
};

/** Build a LDkit property mapping: `{ propertyKey: predicateIRI }` for all known ECHO properties. */
export const buildLdkitPredicates = (keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, ECHO + key]));
