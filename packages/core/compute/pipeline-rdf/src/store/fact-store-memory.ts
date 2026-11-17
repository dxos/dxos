//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Fact, MemoryQuery, MemoryService } from '@dxos/echo-memory';

import { SemanticIndexError } from '../errors.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

const decodePattern = Schema.decodeUnknownEffect(MemoryQuery.FactQuery);

/**
 * A {@link FactStoreApi} over a space's {@link MemoryService.Service}, so the pipelines that still take a FactStore
 * write into and read from the space's memory while they move onto MemoryService.
 */
export const make = (memory: MemoryService.Service): FactStoreApi => {
  const wrap = (message: string) => (cause: unknown) => new SemanticIndexError({ message, cause });
  return {
    putFacts: (facts) => memory.put(facts).pipe(Effect.asVoid, Effect.mapError(wrap('Failed to persist facts'))),
    predicates: () =>
      memory.query(MemoryQuery.predicates()).pipe(
        Effect.map((entries) => [...entries]),
        Effect.mapError(wrap('Failed to read predicates')),
      ),
    query: (query) =>
      decodePattern(query).pipe(
        Effect.flatMap((pattern) => memory.query(MemoryQuery.facts(pattern))),
        Effect.map((facts) => [...facts]),
        Effect.mapError(wrap('Failed to query facts')),
      ),
    select: (sparql) =>
      memory.query(MemoryQuery.graphs(sparql)).pipe(
        Effect.map((facts) => [...facts]),
        Effect.mapError(wrap('SPARQL query failed')),
      ),
    rows: (sparql) =>
      memory.query(MemoryQuery.sparql(sparql)).pipe(
        Effect.map((rows) => [...rows]),
        Effect.mapError(wrap('SPARQL query failed')),
      ),
    cursor: (source) =>
      memory
        .query(MemoryQuery.cursor(Fact.SourceUri.make(source)))
        .pipe(Effect.mapError(wrap('Failed to read cursor'))),
    setCursor: (source, hash) =>
      memory
        .put([], { read: { source: Fact.SourceUri.make(source), through: hash } })
        .pipe(Effect.asVoid, Effect.mapError(wrap('Failed to write cursor'))),
    clear: () => memory.reset().pipe(Effect.mapError(wrap('Failed to clear store'))),
  };
};

/** A FactStore over the MemoryService in context. */
export const layer: Layer.Layer<FactStore, never, MemoryService.MemoryService> = Layer.effect(
  FactStore,
  MemoryService.MemoryService.pipe(Effect.map(make)),
);
