//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type Quad } from 'n3';

import { SemanticIndexError } from '../errors';
import { insertQuadsMemory, makeMemorySource } from '../internal/source/memory-source';
import { insertQuads, makeSqliteSource } from '../internal/source/sqlite-source';
import { makeEngine, selectTriples } from '../internal/sparql/engine';
import { factToTriples, triplesToFacts } from '../internal/sparql/mapping';
import { type SemanticQuery } from '../internal/sparql/query-builder';
import { queryMemory } from '../internal/sparql/query-memory';
import { querySqlite } from '../internal/sparql/query-sqlite';
import { migrate } from '../internal/sqlite/schema';
import { type Fact } from '../types';

export interface FactStoreApi {
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
  /** Remove all facts, entities, and cursors from the store. */
  readonly clear: () => Effect.Effect<void, SemanticIndexError>;
}

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

export class FactStore extends Context.Tag('@dxos/pipeline-rdf/FactStore')<FactStore, FactStoreApi>() {
  static layer: Layer.Layer<FactStore, never, SqlClient.SqlClient> = Layer.scoped(
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
   * Browser/test layer backed by an in-memory N3 store (no `SqlClient`, no SQLite). Structured queries
   * run directly over the store (no SPARQL engine), so the browser path avoids Comunica entirely;
   * `select` (raw SPARQL) still uses Comunica and so is server-side only.
   */
  static layerMemory: Layer.Layer<FactStore> = Layer.sync(FactStore, () => {
    const source = makeMemorySource();
    const cursors = new Map<string, string>();

    const putFacts: FactStoreApi['putFacts'] = (facts) =>
      Effect.sync(() => insertQuadsMemory(source, facts.flatMap(factToTriples)));

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
  });
}
