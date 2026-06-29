//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type Quad } from 'n3';

import { SemanticIndexError } from './errors';
import { insertQuadsMemory, makeMemorySource } from './internal/source/memory-source';
import { insertQuads, makeSqliteSource } from './internal/source/sqlite-source';
import { makeEngine, selectTriples } from './internal/sparql/engine';
import { factToTriples, triplesToFacts } from './internal/sparql/mapping';
import { type SemanticQuery, buildSparql } from './internal/sparql/query-builder';
import { migrate } from './internal/sqlite/schema';
import { type Fact } from './types';

export { type SemanticQuery } from './internal/sparql/query-builder';

export interface SemanticStoreApi {
  /** Reify and persist facts as RDF triples (idempotent appends; no write-time merge). */
  readonly putFacts: (facts: readonly Fact[]) => Effect.Effect<void, SemanticIndexError>;
  /** Run a structured query over the stored facts via SPARQL and reassemble matching Facts. */
  readonly query: (query: SemanticQuery) => Effect.Effect<Fact[], SemanticIndexError>;
  /** Execute a raw SPARQL `SELECT ?fact ?p ?o` and reassemble matching Facts (used for LLM-authored queries). */
  readonly select: (sparql: string) => Effect.Effect<Fact[], SemanticIndexError>;
  /** Read the ingest cursor (last processed source hash) keyed by source DXN. */
  readonly cursor: (source: string) => Effect.Effect<string | undefined, SemanticIndexError>;
  /** Upsert the ingest cursor for the given source DXN. */
  readonly setCursor: (source: string, hash: string) => Effect.Effect<void, SemanticIndexError>;
}

// triplesToFacts validates via Schema and can throw a ParseError on malformed stored data.
const reassemble = (quads: Quad[]): Effect.Effect<Fact[], SemanticIndexError> =>
  Effect.try({
    try: () => triplesToFacts(quads),
    catch: (cause) => new SemanticIndexError({ message: 'Failed to reassemble facts', cause }),
  });

// The structured `query` and raw `select` are identical across sources (the engine is source-agnostic).
const makeQueryApi = (
  engine: ReturnType<typeof makeEngine>,
  source: Parameters<typeof selectTriples>[1],
): Pick<SemanticStoreApi, 'query' | 'select'> => ({
  query: (q) => selectTriples(engine, source, buildSparql(q)).pipe(Effect.flatMap(reassemble)),
  select: (sparql) => selectTriples(engine, source, sparql).pipe(Effect.flatMap(reassemble)),
});

export class SemanticStore extends Context.Tag('@dxos/semantic-index/SemanticStore')<
  SemanticStore,
  SemanticStoreApi
>() {
  static layer: Layer.Layer<SemanticStore, never, SqlClient.SqlClient> = Layer.scoped(
    SemanticStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // Schema creation is a fatal store-construction failure (not a recoverable per-operation error), so die here.
      yield* migrate().pipe(Effect.orDie);
      const engine = makeEngine();
      const source = makeSqliteSource(sql);

      const putFacts: SemanticStoreApi['putFacts'] = (facts) =>
        insertQuads(sql, facts.flatMap(factToTriples)).pipe(
          Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to persist facts', cause })),
        );

      const cursor: SemanticStoreApi['cursor'] = (src) =>
        sql<{ hash: string }>`SELECT hash FROM cursors WHERE source = ${src}`.pipe(
          Effect.map((rows) => rows[0]?.hash),
          Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to read cursor', cause })),
        );

      const setCursor: SemanticStoreApi['setCursor'] = (src, hash) =>
        sql`INSERT INTO cursors (source, hash) VALUES (${src}, ${hash})
            ON CONFLICT(source) DO UPDATE SET hash = ${hash}`.pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to write cursor', cause })),
        );

      return { putFacts, cursor, setCursor, ...makeQueryApi(engine, source) };
    }),
  );

  /**
   * Browser/test layer backed by an in-memory N3 store (no `SqlClient`, no SQLite). Facts live for the
   * lifetime of the layer; the same engine + query/select path is reused.
   */
  static layerMemory: Layer.Layer<SemanticStore> = Layer.sync(SemanticStore, () => {
    const engine = makeEngine();
    const source = makeMemorySource();
    const cursors = new Map<string, string>();

    const putFacts: SemanticStoreApi['putFacts'] = (facts) =>
      Effect.sync(() => insertQuadsMemory(source, facts.flatMap(factToTriples)));

    const cursor: SemanticStoreApi['cursor'] = (src) => Effect.sync(() => cursors.get(src));
    const setCursor: SemanticStoreApi['setCursor'] = (src, hash) => Effect.sync(() => void cursors.set(src, hash));

    return { putFacts, cursor, setCursor, ...makeQueryApi(engine, source) };
  });
}
