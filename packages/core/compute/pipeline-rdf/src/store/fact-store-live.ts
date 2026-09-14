//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { type Quad } from 'n3';

import { type SqlTransaction } from '@dxos/sql-sqlite';

import { SemanticIndexError } from '../errors.ts';
import { insertQuadsMemory, makeMemorySource } from '../internal/source/memory-source.ts';
import { insertQuads, makeSqliteSource } from '../internal/source/sqlite-source.ts';
import { makeEngine, selectTriples } from '../internal/sparql/engine.ts';
import { factToTriples, triplesToFacts } from '../internal/sparql/mapping.ts';
import { queryMemory } from '../internal/sparql/query-memory.ts';
import { querySqlite } from '../internal/sparql/query-sqlite.ts';
import { migrate } from '../internal/sqlite/schema.ts';
import { type Fact } from '../types/index.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

//
// Live implementations of {@link FactStore}. Kept separate from the tag so operation definitions
// (which reference the tag in `services:`) never pull the SPARQL/SQLite machinery into their
// import closure — see `@dxos/pipeline-rdf/fact-store`.
//

// triplesToFacts validates via Schema and can throw a ParseError on malformed stored data.
const reassemble = (quads: Quad[]): Effect.Effect<Fact[], SemanticIndexError> =>
  Effect.try({
    try: () => triplesToFacts(quads),
    catch: (cause) => new SemanticIndexError({ message: 'Failed to reassemble facts', cause }),
  });

// Raw SPARQL execution via Comunica. The engine is constructed lazily so persist-only flows never
// pay for it — and so the memory layer can avoid it entirely (Comunica does not run in the browser).
const makeSelect = (source: Parameters<typeof selectTriples>[1]): FactStoreApi['select'] => {
  let engine: ReturnType<typeof makeEngine> | undefined;
  const getEngine = () => (engine ??= makeEngine());
  return (sparql) => selectTriples(getEngine(), source, sparql).pipe(Effect.flatMap(reassemble));
};

export const layer: Layer.Layer<FactStore, never, SqlClient.SqlClient | SqlTransaction.SqlTransaction> = Layer.effect(
  FactStore,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    // Schema creation is a fatal store-construction failure (not a recoverable per-operation error), so die here.
    yield* migrate().pipe(Effect.orDie);
    const source = makeSqliteSource(sql);

    const putFacts: FactStoreApi['putFacts'] = (facts) =>
      insertQuads(sql, facts.flatMap(factToTriples)).pipe(
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to persist facts', cause })),
      );

    const cursor: FactStoreApi['cursor'] = (src) =>
      sql<{ hash: string }>`SELECT hash FROM cursors WHERE source = ${src}`.pipe(
        Effect.map((rows) => rows[0]?.hash),
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to read cursor', cause })),
      );

    const setCursor: FactStoreApi['setCursor'] = (src, hash) =>
      sql`INSERT INTO cursors (source, hash) VALUES (${src}, ${hash})
          ON CONFLICT(source) DO UPDATE SET hash = ${hash}`.pipe(
        Effect.asVoid,
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to write cursor', cause })),
      );

    const clear: FactStoreApi['clear'] = () =>
      Effect.gen(function* () {
        yield* sql`DELETE FROM triples`;
        yield* sql`DELETE FROM entities`;
        yield* sql`DELETE FROM cursors`;
      }).pipe(
        Effect.asVoid,
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to clear store', cause })),
      );

    // Structured query runs directly over the `triples` table (no SPARQL engine), so the SQLite
    // path works everywhere (browser worker / node / CF DO) — Comunica does not bundle for browser
    // or Workers. `select` (raw SPARQL via Comunica) stays for node-only callers/tests.
    const query: FactStoreApi['query'] = (q) => querySqlite(sql, q);

    return { putFacts, cursor, setCursor, query, select: makeSelect(source), clear };
  }),
);

/**
 * Builds a fresh in-memory FactStore service (no `SqlClient`). Shared by {@link layerMemory} and
 * callers that need a standalone instance without a Layer (e.g. a per-space registry).
 */
export const makeMemory = (): FactStoreApi => {
  const source = makeMemorySource();
  const cursors = new Map<string, string>();

  const putFacts: FactStoreApi['putFacts'] = (facts) =>
    Effect.try({
      try: () => insertQuadsMemory(source, facts.flatMap(factToTriples)),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to persist facts', cause }),
    });

  const cursor: FactStoreApi['cursor'] = (src) => Effect.sync(() => cursors.get(src));
  const setCursor: FactStoreApi['setCursor'] = (src, hash) => Effect.sync(() => void cursors.set(src, hash));

  const query: FactStoreApi['query'] = (q) =>
    Effect.try({
      try: () => queryMemory(source, q),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to query facts', cause }),
    });

  const clear: FactStoreApi['clear'] = () =>
    Effect.sync(() => {
      source.removeQuads(source.getQuads(null, null, null, null));
      cursors.clear();
    });

  return { putFacts, cursor, setCursor, query, select: makeSelect(source), clear };
};

/**
 * Browser/test layer backed by an in-memory N3 store (no `SqlClient`, no SQLite). Structured queries
 * run directly over the store (no SPARQL engine), so the browser path avoids Comunica entirely;
 * `select` (raw SPARQL) still uses Comunica and so is server-side only.
 */
export const layerMemory: Layer.Layer<FactStore> = Layer.sync(FactStore, () => makeMemory());
