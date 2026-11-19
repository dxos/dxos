//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';
import { Parser as TrigParser } from 'n3';
import { Parser } from 'sparqljs';

import { Fact, Graph, Hash, Mapping, Ontology, Rdf, Sparql, Trig, Vocab } from '@dxos/echo-memory';
import {
  EngineCore,
  type Program,
  type Quad,
  type Row,
  SqlSparqlEngine,
  type SqlStorage,
  exec,
  rows,
  runSync,
} from '@dxos/sparql-sqlite';
import { runEffect } from '@dxos/sparql-sqlite/async';
import * as SqliteStorage from '@dxos/sql-sqlite/SqlStorage';

import { SemanticIndexError } from '../errors.ts';
import { type SemanticQuery } from '../internal/sparql/query-builder.ts';
import { FactStore, type FactStoreApi, type SparqlRow } from './fact-store.ts';

//
// Live implementations of {@link FactStore}. Kept separate from the tag so operation definitions
// (which reference the tag in `services:`) never pull the SPARQL/SQLite machinery into their
// import closure — see `@dxos/pipeline-rdf/fact-store`.
//

export type Options = {
  /** Makes each write atomic; a Durable Object passes `(fn) => ctx.storage.transactionSync(fn)`. */
  readonly transactionSync?: <T>(fn: () => T) => T;
  /** Prefix of the store's table names, so several stores can share one database (default none). */
  readonly prefix?: string;
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
const SEED_VERSION = Hash.text(
  SEED_QUADS.map((quad) => `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`).join('\n'),
);
const SEED_MARKER = Rdf.quad(
  Rdf.namedNode(Vocab.ONTOLOGY_GRAPH),
  Rdf.namedNode(Vocab.SX_SEED),
  Rdf.literal(SEED_VERSION),
);

/**
 * The quads persisting the facts, plus the provenance of each predicate they mint that the store has not described
 * yet, so a predicate records when, by what and from which quote it was first minted rather than every use.
 */
const factQuads = (facts: readonly Fact.Fact[], described: ReadonlySet<string>): Rdf.Quad[] => [
  ...facts.flatMap((fact) => Mapping.factToTriples(fact)),
  ...Graph.mintedPredicates(facts)
    .filter(({ iri }) => !described.has(iri))
    .flatMap(Ontology.toQuads),
];

const attempt =
  (message: string) =>
  <A>(run: () => A): Effect.Effect<A, SemanticIndexError> =>
    Effect.try({ try: run, catch: (cause) => new SemanticIndexError({ message, cause }) });

function* dropLegacyTables(): Program<void> {
  const legacy = yield* rows(
    `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name IN ('triples', 'rdf_migrations')`,
  );
  if (legacy.length > 0) {
    for (const table of LEGACY_TABLES) {
      yield* exec(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}

/** Every quad: each statement in its named graph, then the default graph's statements about graphs. */
const ALL_QUADS_SPARQL = 'SELECT ?g ?s ?p ?o WHERE { { GRAPH ?g { ?s ?p ?o } } UNION { ?g ?p ?o } }';

/** The seed marker names this store's seed version, so it is neither exported nor taken from another store. */
const isSeedMarker = (quad: Rdf.Quad): boolean => quad.predicate.value === Vocab.SX_SEED;

const writeTrig = (quads: readonly Rdf.Quad[]): Effect.Effect<string> =>
  Effect.sync(() => Trig.write(quads, { prefixes: Graph.EXPORT_PREFIXES }));

/** Fails unless `sparql` is a `SELECT`, since the engine would run an update as readily as a query. */
const assertSelect = (sparql: string): void => {
  const parsed = new Parser().parse(sparql);
  if (parsed.type !== 'query' || parsed.queryType !== 'SELECT') {
    throw new TypeError(`Expected a SPARQL SELECT, got ${parsed.type === 'query' ? parsed.queryType : 'an update'}`);
  }
};

/** Drops the variables a solution leaves unbound, which the engine reports as `undefined`. */
const toSparqlRow = (row: Row): SparqlRow =>
  Object.fromEntries(Object.entries(row).flatMap(([name, term]) => (term ? [[name, term]] : [])));

/**
 * The store's operations as programs over the engine, so one implementation runs on synchronous storage
 * ({@link make}) and on an async `SqlClient` ({@link makeAsync}). Each runs in one transaction where it writes.
 */
const programs = (engine: EngineCore, prefix = '') => {
  const cursors = `${prefix}${CURSORS_TABLE}`;

  function* insert(rdfQuads: readonly Rdf.Quad[]): Program<void> {
    const quads: Quad[] = rdfQuads.map(Sparql.toQuad);
    for (let start = 0; start < quads.length; start += INSERT_BATCH) {
      yield* engine.insert(quads.slice(start, start + INSERT_BATCH));
    }
  }

  // A store whose seed is current holds the marker; one written by another seed has its seed predicates rewritten.
  function* seed(): Program<void> {
    const [marker] = yield* engine.query(Sparql.SEED_MARKER_SPARQL);
    if (marker?.v?.value === SEED_VERSION) {
      return;
    }
    for (const update of Sparql.deleteSeedSparql(SEED_IRIS)) {
      yield* engine.query(update);
    }
    yield* insert([...SEED_QUADS, SEED_MARKER]);
  }

  function* ontologyQuads(): Program<Rdf.Quad[]> {
    return Sparql.rowsToQuads(yield* engine.query(Sparql.ONTOLOGY_SPARQL));
  }

  return {
    *init(): Program<void> {
      // Only an unprefixed store can hold the old layout; in a shared database those names may be the host's.
      if (prefix === '') {
        yield* dropLegacyTables();
      }
      yield* engine.init();
      yield* exec(`CREATE TABLE IF NOT EXISTS ${cursors} (source TEXT PRIMARY KEY, hash TEXT NOT NULL)`);
      yield* seed();
    },

    *putFacts(facts: readonly Fact.Fact[]): Program<void> {
      const described = new Set(
        (yield* engine.query(Sparql.DESCRIBED_PREDICATES_SPARQL)).flatMap(({ s: subject }) =>
          subject ? [subject.value] : [],
        ),
      );
      yield* insert(factQuads(facts, described));
    },

    *predicates(): Program<Ontology.Entry[]> {
      return Ontology.fromQuads(yield* ontologyQuads());
    },

    // A graph found by one statement may hold others, so each reassembled statement is checked against the query
    // again; `triplesToFacts` validates via Schema, so malformed stored data fails here too.
    *query(semanticQuery: SemanticQuery): Program<Fact.Fact[]> {
      const ontology = yield* ontologyQuads();
      const predicates =
        semanticQuery.predicate === undefined
          ? undefined
          : Sparql.matchingPredicates(
              semanticQuery.predicate,
              Sparql.predicateLabels(
                (yield* engine.query(Sparql.STORED_PREDICATES_SPARQL)).flatMap(({ p }) => (p ? [p.value] : [])),
                ontology,
              ),
            );
      const quads = Sparql.rowsToQuads(
        yield* engine.query(Sparql.graphQuadsSparql(Sparql.candidateGraphs(semanticQuery, predicates))),
      );
      return Mapping.triplesToFacts([...quads, ...ontology]).filter((fact) =>
        Sparql.statementMatches(fact, semanticQuery, predicates),
      );
    },

    *select(sparql: string): Program<Fact.Fact[]> {
      assertSelect(sparql);
      const graphs = Sparql.boundGraphs(yield* engine.query(sparql));
      if (graphs.length === 0) {
        return [];
      }
      const quads: Rdf.Quad[] = [];
      for (let start = 0; start < graphs.length; start += LOAD_BATCH) {
        const batch = Sparql.graphValues(graphs.slice(start, start + LOAD_BATCH));
        quads.push(...Sparql.rowsToQuads(yield* engine.query(Sparql.graphQuadsSparql(batch))));
      }
      return Mapping.triplesToFacts([...quads, ...(yield* ontologyQuads())]);
    },

    *rows(sparql: string): Program<SparqlRow[]> {
      assertSelect(sparql);
      return (yield* engine.query(sparql)).map(toSparqlRow);
    },

    *cursor(source: string): Program<string | undefined> {
      const [row] = yield* rows(`SELECT hash FROM ${cursors} WHERE source = ?`, source);
      return typeof row?.hash === 'string' ? row.hash : undefined;
    },

    *setCursor(source: string, hash: string): Program<void> {
      yield* exec(
        `INSERT INTO ${cursors} (source, hash) VALUES (?, ?) ON CONFLICT(source) DO UPDATE SET hash = excluded.hash`,
        source,
        hash,
      );
    },

    // The seed marker names this store's seed version, so it is neither exported nor taken from another store.
    *exportQuads(): Program<Rdf.Quad[]> {
      return Sparql.rowsToQuads(yield* engine.query(ALL_QUADS_SPARQL)).filter((quad) => !isSeedMarker(quad));
    },

    *importQuads(quads: readonly Rdf.Quad[]): Program<number> {
      const kept = quads.filter((quad) => !isSeedMarker(quad));
      yield* insert(kept);
      return kept.length;
    },

    // One transaction, so a store is never left without its seed vocabulary.
    *clear(): Program<void> {
      yield* engine.reset();
      yield* exec(`DELETE FROM ${cursors}`);
      yield* seed();
    },
  };
};

type Programs = ReturnType<typeof programs>;

/** A FactStoreApi from a function that runs a program (in a transaction when `write`) as an Effect. */
const fromPrograms = (
  ops: Programs,
  run: <A>(program: () => Program<A>, message: string, write?: boolean) => Effect.Effect<A, SemanticIndexError>,
): FactStoreApi => ({
  putFacts: (facts) => run(() => ops.putFacts(facts), 'Failed to persist facts', true),
  predicates: () => run(() => ops.predicates(), 'Failed to read predicates'),
  query: (semanticQuery) => run(() => ops.query(semanticQuery), 'Failed to query facts'),
  select: (sparql) => run(() => ops.select(sparql), 'SPARQL query failed'),
  rows: (sparql) => run(() => ops.rows(sparql), 'SPARQL query failed'),
  cursor: (source) => run(() => ops.cursor(source), 'Failed to read cursor'),
  setCursor: (source, hash) => run(() => ops.setCursor(source, hash), 'Failed to write cursor', true),
  exportTrig: () => run(() => ops.exportQuads(), 'Failed to read the store for export').pipe(Effect.flatMap(writeTrig)),
  importTrig: (trig) =>
    Effect.try({
      try: () => new TrigParser({ format: 'application/trig' }).parse(trig),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to parse TriG', cause }),
    }).pipe(Effect.flatMap((quads) => run(() => ops.importQuads(quads), 'Failed to import TriG', true))),
  clear: () => run(() => ops.clear(), 'Failed to clear store', true),
});

const open = (
  storage: SqlStorage,
  transactionSync: NonNullable<Options['transactionSync']>,
  prefix: string | undefined,
): FactStoreApi => {
  const ops = programs(new SqlSparqlEngine(storage, { prefix }).core, prefix);
  transactionSync(() => runSync(storage, ops.init()));
  return fromPrograms(ops, (program, message, write) =>
    Effect.try({
      try: () => (write ? transactionSync(() => runSync(storage, program())) : runSync(storage, program())),
      catch: (cause) => new SemanticIndexError({ message, cause }),
    }),
  );
};

/**
 * Opens a FactStore over the async `SqlClient` in context (a host whose database is only reachable that way). The
 * same operations as {@link make}, one at a time, each write in a `withTransaction`.
 */
export const makeAsync = ({ prefix }: Pick<Options, 'prefix'> = {}): Effect.Effect<
  FactStoreApi,
  SemanticIndexError,
  SqlClient.SqlClient
> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const lock = yield* Semaphore.make(1);
    const ops = programs(new EngineCore({ prefix }), prefix);
    const run = <A>(program: () => Program<A>, message: string, write = false) => {
      const toError = (cause: unknown) => new SemanticIndexError({ message, cause });
      const effect = Effect.suspend(() => runEffect(program(), toError)).pipe(Effect.mapError(toError));
      return lock.withPermit(write ? sql.withTransaction(effect) : effect).pipe(
        Effect.mapError((error) => (error instanceof SemanticIndexError ? error : toError(error))),
        Effect.provideService(SqlClient.SqlClient, sql),
      );
    };
    yield* run(() => ops.init(), 'Failed to initialize the fact store', true);
    return fromPrograms(ops, run);
  });

/** Layer of {@link makeAsync}. */
export const layerAsync: Layer.Layer<FactStore, SemanticIndexError, SqlClient.SqlClient> = Layer.effect(
  FactStore,
  makeAsync(),
);

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
  return attempt('Failed to initialize the fact store')(() => open(storage, transactionSync, options.prefix)).pipe(
    Effect.orDie,
  );
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
    rows: (sparql) => get.pipe(Effect.flatMap((opened) => opened.rows(sparql))),
    cursor: (source) => get.pipe(Effect.flatMap((opened) => opened.cursor(source))),
    setCursor: (source, hash) => get.pipe(Effect.flatMap((opened) => opened.setCursor(source, hash))),
    exportTrig: () => get.pipe(Effect.flatMap((opened) => opened.exportTrig())),
    importTrig: (trig) => get.pipe(Effect.flatMap((opened) => opened.importTrig(trig))),
    clear: () => get.pipe(Effect.flatMap((opened) => opened.clear())),
  };
};

/**
 * Layer of a FactStore over a SQLite file (created when absent), closed with the layer's scope; reopening the same
 * path sees the facts and cursors written before.
 */
export const layerFile = (path: string): Layer.Layer<FactStore> =>
  Layer.effect(
    FactStore,
    Effect.acquireRelease(SqliteStorage.makeFile(path), (database) => Effect.sync(() => database.close())).pipe(
      Effect.orDie,
      Effect.flatMap((database) => make(database)),
    ),
  );

/** Layer of a FactStore over a private in-memory SQLite database, closed with the layer's scope. */
export const layerMemory: Layer.Layer<FactStore> = Layer.effect(
  FactStore,
  Effect.acquireRelease(SqliteStorage.makeMemory(), (database) => Effect.sync(() => database.close())).pipe(
    Effect.orDie,
    Effect.flatMap((database) => make(database)),
  ),
);
