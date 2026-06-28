//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SemanticIndexError } from './errors';
import { insertQuads, makeSqliteSource } from './internal/source/sqlite-source';
import { makeEngine, selectTriples } from './internal/sparql/engine';
import { factToTriples, triplesToFacts } from './internal/sparql/mapping';
import { buildSparql, type SemanticQuery } from './internal/sparql/query-builder';
import { migrate } from './internal/sqlite/schema';
import { type Fact } from './types';

export { type SemanticQuery } from './internal/sparql/query-builder';

export interface SemanticStoreApi {
  /** Reify and persist facts as RDF triples (idempotent appends; no write-time merge). */
  readonly putFacts: (facts: readonly Fact[]) => Effect.Effect<void, SemanticIndexError>;
  /** Run a structured query over the stored facts via SPARQL and reassemble matching Facts. */
  readonly query: (query: SemanticQuery) => Effect.Effect<Fact[], SemanticIndexError>;
  /** Read the ingest cursor (last processed source hash) keyed by source DXN. */
  readonly cursor: (source: string) => Effect.Effect<string | undefined, SemanticIndexError>;
  /** Upsert the ingest cursor for the given source DXN. */
  readonly setCursor: (source: string, hash: string) => Effect.Effect<void, SemanticIndexError>;
}

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

      const query: SemanticStoreApi['query'] = (q) =>
        selectTriples(engine, source, buildSparql(q)).pipe(
          // triplesToFacts validates via Schema and can throw a ParseError on malformed stored data.
          Effect.flatMap((quads) =>
            Effect.try({
              try: () => triplesToFacts(quads),
              catch: (cause) => new SemanticIndexError({ message: 'Failed to reassemble facts', cause }),
            }),
          ),
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

      return { putFacts, query, cursor, setCursor };
    }),
  );
}
