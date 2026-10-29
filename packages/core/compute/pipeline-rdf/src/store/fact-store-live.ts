//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { DataFactory, type Quad as RdfQuad } from 'n3';

import { type Quad, SqlSparqlEngine, type SqlStorage } from '@dxos/sparql-sqlite';
import * as SqliteStorage from '@dxos/sql-sqlite/SqlStorage';

import { SemanticIndexError } from '../errors.ts';
import {
  DESCRIBED_PREDICATES_SPARQL,
  ONTOLOGY_SPARQL,
  SEED_MARKER_SPARQL,
  STORED_PREDICATES_SPARQL,
  candidateGraphs,
  deleteSeedSparql,
  graphQuadsSparql,
  graphValues,
  predicateLabels,
} from '../internal/sparql/fact-query.ts';
import { matchingPredicates, statementMatches } from '../internal/sparql/match.ts';
import { boundGraphs, rowsToQuads, toQuad } from '../internal/sparql/terms.ts';
import { hashText } from '../internal/stages/reconcile.ts';
import { type Fact, Graph, Ontology } from '../types/index.ts';
import * as Mapping from '../types/Mapping.ts';
import * as Vocab from '../types/Vocab.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

//
// Live implementations of {@link FactStore}. Kept separate from the tag so operation definitions
// (which reference the tag in `services:`) never pull the SPARQL/SQLite machinery into their
// import closure - see `@dxos/pipeline-rdf/fact-store`.
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

/**
 * The seed vocabulary every store starts with (and starts with again once cleared): `Ontology.DEFAULT` described in
 * the ontology graph, plus a marker naming its version, so a store written by an older seed is brought up to date.
 */
const SEED_QUADS = Ontology.ontologyQuads(Ontology.DEFAULT);
const SEED_IRIS = [...new Set(SEED_QUADS.map((quad) => quad.subject.value))];
const SEED_VERSION = hashText(
  SEED_QUADS.map((quad) => `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`).join('\n'),
);
const SEED_MARKER = DataFactory.quad(
  DataFactory.namedNode(Vocab.ONTOLOGY_GRAPH),
  DataFactory.namedNode(Vocab.SX_SEED),
  DataFactory.literal(SEED_VERSION),
);

/**
 * The quads persisting the facts, plus the provenance of each predicate they mint that the store has not described
 * yet, so a predicate records when, by what and from which quote it was first minted rather than every use.
 */
const factQuads = (facts: readonly Fact[], described: ReadonlySet<string>): RdfQuad[] => [
  ...facts.flatMap((fact) => Mapping.factToTriples(fact)),
  ...Graph.mintedPredicates(facts)
    .filter(({ iri }) => !described.has(iri))
    .flatMap(Ontology.toQuads),
];

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
  const engine = new SqlSparqlEngine(storage);

  const insert = (rdfQuads: readonly RdfQuad[]): void => {
    const quads: Quad[] = rdfQuads.map(toQuad);
    for (let start = 0; start < quads.length; start += INSERT_BATCH) {
      engine.insert(quads.slice(start, start + INSERT_BATCH));
    }
  };

  // A store whose seed is current holds the marker; one written by another seed has its seed predicates rewritten.
  const seed = (): void => {
    const [marker] = engine.query(SEED_MARKER_SPARQL);
    if (marker?.v?.value === SEED_VERSION) {
      return;
    }
    for (const update of deleteSeedSparql(SEED_IRIS)) {
      engine.query(update);
    }
    insert([...SEED_QUADS, SEED_MARKER]);
  };

  transactionSync(() => {
    dropLegacyTables(storage);
    engine.init();
    storage.exec(`CREATE TABLE IF NOT EXISTS ${CURSORS_TABLE} (source TEXT PRIMARY KEY, hash TEXT NOT NULL)`);
    seed();
  });

  const putFacts: FactStoreApi['putFacts'] = (facts) =>
    attempt('Failed to persist facts')(() =>
      transactionSync(() => {
        const described = new Set(
          engine.query(DESCRIBED_PREDICATES_SPARQL).flatMap(({ s: subject }) => (subject ? [subject.value] : [])),
        );
        insert(factQuads(facts, described));
      }),
    );

  const ontologyQuads = () => rowsToQuads(engine.query(ONTOLOGY_SPARQL));

  const predicates: FactStoreApi['predicates'] = () =>
    attempt('Failed to read predicates')(() => Ontology.fromQuads(ontologyQuads()));

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
      // One transaction, so a store is never left without its seed vocabulary.
      transactionSync(() => {
        engine.reset();
        storage.exec(`DELETE FROM ${CURSORS_TABLE}`);
        seed();
      }),
    );

  return { putFacts, predicates, query, select, cursor, setCursor, clear };
};

/** Storage that runs its own transactions, as every `@dxos/sql-sqlite/SqlStorage` database does. */
type TransactionalStorage = SqlStorage & Required<Options>;

/**
 * Opens a FactStore over synchronous SQLite: a Durable Object's `ctx.storage.sql` (which must pass
 * `transactionSync`), or a database from `@dxos/sql-sqlite/SqlStorage`. Creates the schema on first use; a
 * schema failure, or storage with no way to make writes atomic, is a defect.
 */
export const make = (
  storage: SqlStorage | TransactionalStorage,
  options: Options = {},
): Effect.Effect<FactStoreApi> => {
  const transactionSync =
    options.transactionSync ??
    ('transactionSync' in storage ? <T>(run: () => T): T => storage.transactionSync(run) : undefined);
  if (!transactionSync) {
    return Effect.die(new Error('FactStoreLive needs transactionSync for storage that has none of its own'));
  }
  return attempt('Failed to initialize the fact store')(() => open(storage, transactionSync)).pipe(Effect.orDie);
};

/** Layer of {@link make}. */
export const layer = (storage: SqlStorage | TransactionalStorage, options?: Options): Layer.Layer<FactStore> =>
  Layer.effect(FactStore, make(storage, options));

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
            make(database).pipe(
              Effect.onError(() => Effect.sync(() => database.close())),
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
    predicates: () => get.pipe(Effect.flatMap((opened) => opened.predicates())),
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
    Effect.flatMap((database) => make(database)),
  ),
);
