//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Fact, Graph, MemoryError, MemoryQuery, MemoryService, RdfStore } from '@dxos/echo-memory';

import { SemanticIndexError } from '../errors.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

const decodePattern = Schema.decodeUnknownEffect(MemoryQuery.FactQuery);

/**
 * A {@link FactStoreApi} over a space's {@link MemoryService.Service}, so the pipelines that still take a FactStore
 * write into and read from the space's memory while they move onto MemoryService.
 */
export const make = (memory: MemoryService.Service, rdf?: RdfStore.Service): FactStoreApi => {
  /** TriG crosses as bytes, serialized and parsed beside the store. */
  const store = (op: string): Effect.Effect<RdfStore.Service, SemanticIndexError> =>
    rdf ? Effect.succeed(rdf) : Effect.fail(new SemanticIndexError({ message: `${op} needs the space's RDF store` }));
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
    exportTrig: () =>
      store('Export').pipe(
        Effect.flatMap((through) => through.export('trig', { prefixes: Graph.EXPORT_PREFIXES })),
        Effect.map((data) => new TextDecoder().decode(data)),
        Effect.mapError(wrap('Failed to read the store for export')),
      ),
    importTrig: (trig) =>
      store('Import').pipe(
        Effect.flatMap((through) => through.import(new TextEncoder().encode(trig), 'trig')),
        Effect.map(({ quads }) => quads),
        Effect.mapError(wrap('Failed to import TriG')),
      ),
    clear: () => memory.reset().pipe(Effect.mapError(wrap('Failed to clear store'))),
  };
};

/**
 * A {@link MemoryService.Service} over a FactStore, for a store that holds facts but no event base (a remote fact
 * server): the knowledge-base ops go to the store, and the subscription ops fail, since there is nothing to run them.
 */
export const toMemory = (store: FactStoreApi): MemoryService.Service => {
  const wrap = (message: string) => MemoryError.MemoryError.wrap({ message });
  const unsupported = (op: string) =>
    Effect.fail(new MemoryError.MemoryError({ message: `A fact store has no event base: ${op} is not supported` }));
  return {
    put: (facts, options) =>
      Effect.gen(function* () {
        yield* store.putFacts(facts);
        if (options?.read) {
          yield* store.setCursor(options.read.source, options.read.through);
        }
        return 0;
      }).pipe(Effect.mapError(wrap('Failed to put facts'))),
    query: (query) => {
      const answer: Effect.Effect<unknown, SemanticIndexError> =
        query._tag === 'facts'
          ? store.query(query.pattern)
          : query._tag === 'graphs'
            ? store.select(query.sparql)
            : query._tag === 'sparql'
              ? store.rows(query.sparql)
              : query._tag === 'predicates'
                ? store.predicates()
                : store.cursor(query.source);
      return answer.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(MemoryQuery.resultOf(query))),
        Effect.mapError(wrap(`Failed to answer a ${query._tag} query`)),
      );
    },
    reset: () => store.clear().pipe(Effect.mapError(wrap('Failed to reset memory'))),
    subscribe: () => unsupported('subscribe'),
    subscriptions: () => Effect.succeed([]),
    unsubscribe: () => Effect.succeed(false),
    take: () => Effect.succeed([]),
    ack: () => Effect.void,
  };
};

/** A FactStore over the MemoryService and RdfStore in context. */
export const layer: Layer.Layer<FactStore, never, MemoryService.MemoryService | RdfStore.RdfStore> = Layer.effect(
  FactStore,
  Effect.gen(function* () {
    return make(yield* MemoryService.MemoryService, yield* RdfStore.RdfStore);
  }),
);
