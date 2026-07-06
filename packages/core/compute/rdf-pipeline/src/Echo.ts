//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { Entity, Obj } from '@dxos/echo';
import type * as EntityModule from '@dxos/echo/Entity';
import type * as RefModule from '@dxos/echo/Ref';

import { RdfPipelineError } from './errors';
import { Graph } from './Graph';
import { entityJsonToQuads, entitiesToQuads, quadsToEntityJson } from './internal/entity-rdf';
import { ECHO } from './internal/vocab';

/** JSON-LD document for a single ECHO entity (standalone, includes `@context`). */
export type JsonLdDocument = {
  readonly '@context': Record<string, string>;
  readonly '@id': string;
  readonly '@type'?: string;
  readonly [key: string]: unknown;
};

/** A node inside a JSON-LD `@graph` array — no per-node `@context`. */
export type JsonLdNode = Omit<JsonLdDocument, '@context'>;

const DEFAULT_CONTEXT: Record<string, string> = {
  '@vocab': ECHO,
  echo: ECHO,
  id: '@id',
  type: '@type',
};

/** Convert an entity JSON document to a JSON-LD node (no `@context`). */
export const jsonToJsonLdNode = (json: EntityModule.JSON | Obj.JSON): JsonLdNode => {
  const { id, '@type': type, '@meta': _meta, ...rest } = json as Record<string, unknown> & {
    id: string;
    '@type'?: unknown;
    '@meta'?: unknown;
  };
  return {
    '@id': `echo:/${id}`,
    ...(type !== undefined ? { '@type': String(type) } : {}),
    ...rewriteRefs(rest),
  };
};

/** Convert an entity JSON document to a standalone JSON-LD document (includes `@context`). */
export const jsonToJsonLd = (json: EntityModule.JSON | Obj.JSON): JsonLdDocument => ({
  '@context': DEFAULT_CONTEXT,
  ...jsonToJsonLdNode(json),
});

/**
 * Recursively converts ECHO reference objects `{ "/": "echo:/..." }` to JSON-LD
 * node references `{ "@id": "echo:/..." }` so the output is valid JSON-LD.
 */
const rewriteRefs = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(rewriteRefs);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // ECHO encoded reference: { "/": "<dxn or echo uri>" }
    if ('/' in obj && typeof obj['/'] === 'string' && Object.keys(obj).length === 1) {
      const uri = obj['/'];
      return { '@id': uri.startsWith('dxn:') || uri.startsWith('echo:') ? uri : `echo:${uri}` };
    }
    return Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, rewriteRefs(val)]));
  }
  return value;
};

/** Convert a live entity to a standalone JSON-LD document (includes `@context`). */
export const entityToJsonLd = (entity: EntityModule.Unknown | EntityModule.Snapshot): JsonLdDocument =>
  jsonToJsonLd(Entity.toJSON(entity));

/** Convert multiple entities to a JSON-LD graph document (single shared `@context`). */
export const entitiesToJsonLd = (
  entities: readonly (EntityModule.Unknown | EntityModule.Snapshot)[],
): { readonly '@context': Record<string, string>; readonly '@graph': JsonLdNode[] } => ({
  '@context': DEFAULT_CONTEXT,
  '@graph': entities.map((entity) => jsonToJsonLdNode(Entity.toJSON(entity))),
});

/** Parse JSON-LD into entity JSON suitable for {@link Obj.fromJSON}. */
export const jsonLdToEntityJson = (document: JsonLdDocument): EntityModule.JSON | Obj.JSON => {
  const { '@context': _context, '@id': iri, '@type': type, ...rest } = document;
  const id = iri.startsWith('echo:/') ? iri.slice('echo:/'.length) : iri;
  return {
    id,
    ...(type !== undefined ? { '@type': type } : {}),
    ...rest,
  } as EntityModule.JSON;
};

export type FromJsonLdOptions = {
  readonly refResolver?: RefModule.Resolver;
};

/** Hydrate an entity from JSON-LD. */
export const fromJsonLd = (
  document: JsonLdDocument,
  options: FromJsonLdOptions = {},
): Effect.Effect<EntityModule.Unknown, RdfPipelineError> =>
  Effect.tryPromise({
    try: () => Obj.fromJSON(jsonLdToEntityJson(document), options),
    catch: (cause) => new RdfPipelineError({ message: 'Failed to parse JSON-LD entity', cause }),
  });

/** Build a graph from entity JSON-LD documents. */
export const jsonLdToGraph = (documents: readonly JsonLdDocument[]): Graph =>
  Graph.fromQuads(documents.flatMap((document) => entityJsonToQuads(jsonLdToEntityJson(document))));

/** Build a graph from live entities (JSON-LD mode entrypoint). */
export const entitiesToGraph = (entities: readonly EntityModule.Unknown[]): Graph =>
  Graph.fromQuads(entitiesToQuads(entities));

/** Serialize graph entities back to standalone JSON-LD documents. */
export const graphToJsonLd = (graph: Graph): JsonLdDocument[] =>
  quadsToEntityJson(graph.getQuads()).map(jsonToJsonLd);
