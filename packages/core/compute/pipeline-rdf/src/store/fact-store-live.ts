//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type Quad as RdfQuad } from 'n3';

import { type Quad, SqlSparqlEngine, type SqlStorage } from '@dxos/sparql-sqlite';
import * as SqliteStorage from '@dxos/sql-sqlite/SqlStorage';

import { SemanticIndexError } from '../errors.ts';
import {
  ONTOLOGY_SPARQL,
  STORED_PREDICATES_SPARQL,
  candidateGraphs,
  graphQuadsSparql,
  graphValues,
  predicateLabels,
} from '../internal/sparql/fact-query.ts';
import { matchingPredicates, statementMatches } from '../internal/sparql/match.ts';
import { boundGraphs, rowsToQuads, toQuad } from '../internal/sparql/terms.ts';
import * as Mapping from '../types/Mapping.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

//
// Live implementations of {@link FactStore}. Kept separate from the tag so operation definitions
// (which reference the tag in `services:`) never pull the SPARQL/SQLite machinery into their
// import closure — see `@dxos/pipeline-rdf/fact-store`.
//

export type Options = {
  /** Makes each write atomic; a Durable Object passes `(fn) => ctx.storage.transactionSync(fn)`. */
  readonly transactionSync?: <T>(fn: () => T) => T;
};

const CURSORS_TABLE = 'fact_cursors';

/** Tables of the store's earlier text-triples schema, whose data is discarded rather than migrated. */
const LEGACY_TABLES = ['triples', 'entities', 'cursors', 'rdf_migrations'];

/** Durable Objects cap a bound string near 2 MB, and the engine binds each batch as one JSON string. */
const INSERT_BATCH = 5_000;

/** Durable Objects cap statement text at 100 KB, and each graph a `select` binds is inlined as an IRI. */
const LOAD_BATCH = 200;

const dropLegacyTables = (storage: SqlStorage): void => {
  const legacy = storage
    .exec(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name IN ('triples', 'rdf_migrations')`)
    .toArray();
  if (legacy.length > 0) {
    for (const table of LEGACY_TABLES) {
      storage.exec(`DROP TABLE IF EXISTS ${table}`);
    }
  }
};

const attempt =
  (message: string) =>
  <A>(run: () => A): Effect.Effect<A, SemanticIndexError> =>
    Effect.try({ try: run, catch: (cause) => new SemanticIndexError({ message, cause }) });

const open = (storage: SqlStorage, transactionSync: NonNullable<Options['transactionSync']>): FactStoreApi => {
  const engine = transactionSync(() => {
    dropLegacyTables(storage);
    const engine = new SqlSparqlEngine(storage);
    engine.init();
    storage.exec(`CREATE TABLE IF NOT EXISTS ${CURSORS_TABLE} (source TEXT PRIMARY KEY, hash TEXT NOT NULL)`);
    return engine;
  });

  const putFacts: FactStoreApi['putFacts'] = (facts) =>
    attempt('Failed to persist facts')(() => {
      const quads: Quad[] = facts.flatMap((fact) => Mapping.factToTriples(fact)).map(toQuad);
      transactionSync(() => {
        for (let start = 0; start < quads.length; start += INSERT_BATCH) {
          engine.insert(quads.slice(start, start + INSERT_BATCH));
        }
      });
    });

  const ontologyQuads = () => rowsToQuads(engine.query(ONTOLOGY_SPARQL));

  // A graph found by one statement may hold others, so each reassembled statement is checked against the query
  // again; `triplesToFacts` validates via Schema, so malformed stored data fails here too.
  const query: FactStoreApi['query'] = (semanticQuery) =>
    attempt('Failed to query facts')(() => {
      const ontology = ontologyQuads();
      const predicates =
        semanticQuery.predicate === undefined
          ? undefined
          : matchingPredicates(
              semanticQuery.predicate,
              predicateLabels(
                engine.query(STORED_PREDICATES_SPARQL).flatMap(({ p }) => (p ? [p.value] : [])),
                ontology,
              ),
            );
      const quads = rowsToQuads(engine.query(graphQuadsSparql(candidateGraphs(semanticQuery, predicates))));
      return Mapping.triplesToFacts([...quads, ...ontology]).filter((fact) =>
        statementMatches(fact, semanticQuery, predicates),
      );
    });

  const select: FactStoreApi['select'] = (sparql) =>
    attempt('SPARQL query failed')(() => boundGraphs(engine.query(sparql))).pipe(
      Effect.flatMap((graphs) =>
        attempt('Failed to reassemble facts')(() => {
          const quads: RdfQuad[] = [];
          for (let start = 0; start < graphs.length; start += LOAD_BATCH) {
            const batch = graphValues(graphs.slice(start, start + LOAD_BATCH));
            quads.push(...rowsToQuads(engine.query(graphQuadsSparql(batch))));
          }
          return graphs.length === 0 ? [] : Mapping.triplesToFacts([...quads, ...ontologyQuads()]);
        }),
      ),
    );

  const cursor: FactStoreApi['cursor'] = (source) =>
    attempt('Failed to read cursor')(() => {
      const [row] = storage.exec(`SELECT hash FROM ${CURSORS_TABLE} WHERE source = ?`, source).toArray();
      return typeof row?.hash === 'string' ? row.hash : undefined;
    });

  const setCursor: FactStoreApi['setCursor'] = (source, hash) =>
    attempt('Failed to write cursor')(() => {
      storage.exec(
        `INSERT INTO ${CURSORS_TABLE} (source, hash) VALUES (?, ?) ON CONFLICT(source) DO UPDATE SET hash = excluded.hash`,
        source,
        hash,
      );
    });

  const clear: FactStoreApi['clear'] = () =>
    attempt('Failed to clear store')(() =>
      transactionSync(() => {
        engine.reset();
        storage.exec(`DELETE FROM ${CURSORS_TABLE}`);
      }),
    );

  return { putFacts, query, select, cursor, setCursor, clear };
};

/**
 * Opens a FactStore over synchronous SQLite: a Durable Object's `ctx.storage.sql`, or a database from
 * `@dxos/sql-sqlite/SqlStorage`. Creates the schema on first use; a schema failure is a defect.
 */
export const make = (
  storage: SqlStorage,
  { transactionSync = (run) => run() }: Options = {},
): Effect.Effect<FactStoreApi> =>
  attempt('Failed to initialize the fact store')(() => open(storage, transactionSync)).pipe(Effect.orDie);

/** Layer of {@link make}. */
export const layer = (storage: SqlStorage, options?: Options): Layer.Layer<FactStore> =>
  Layer.effect(FactStore, make(storage, options));

const openDatabase = (database: SqliteStorage.Database): Effect.Effect<FactStoreApi> =>
  make(database, { transactionSync: (run) => database.transactionSync(run) });

const memoryError = (cause: unknown) =>
  new SemanticIndexError({ message: 'Failed to open the in-memory fact store', cause });

/**
 * A FactStore over a private in-memory SQLite database, constructed synchronously: the database (whose
 * browser driver loads asynchronously) opens on the first operation.
 */
export const makeMemory = (): FactStoreApi => {
  let store: FactStoreApi | undefined;
  const get: Effect.Effect<FactStoreApi, SemanticIndexError> = Effect.suspend(() =>
    store
      ? Effect.succeed(store)
      : SqliteStorage.makeMemory().pipe(
          Effect.mapError(memoryError),
          Effect.flatMap((database) =>
            openDatabase(database).pipe(
              Effect.map((opened) => {
                // A concurrent first call may have opened one already; keep that one so all calls share it.
                if (store) {
                  database.close();
                  return store;
                }
                return (store = opened);
              }),
            ),
          ),
        ),
  );

  return {
    putFacts: (facts) => get.pipe(Effect.flatMap((opened) => opened.putFacts(facts))),
    query: (semanticQuery) => get.pipe(Effect.flatMap((opened) => opened.query(semanticQuery))),
    select: (sparql) => get.pipe(Effect.flatMap((opened) => opened.select(sparql))),
    cursor: (source) => get.pipe(Effect.flatMap((opened) => opened.cursor(source))),
    setCursor: (source, hash) => get.pipe(Effect.flatMap((opened) => opened.setCursor(source, hash))),
    clear: () => get.pipe(Effect.flatMap((opened) => opened.clear())),
  };
};

/** Layer of a FactStore over a private in-memory SQLite database, closed with the layer's scope. */
export const layerMemory: Layer.Layer<FactStore> = Layer.effect(
  FactStore,
  Effect.acquireRelease(SqliteStorage.makeMemory(), (database) => Effect.sync(() => database.close())).pipe(
    Effect.orDie,
    Effect.flatMap(openDatabase),
  ),
);
