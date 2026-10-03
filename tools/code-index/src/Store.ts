//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type { Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject } from '@rdfjs/types';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import { type Schema as LdkitSchema, type Lens } from 'ldkit';
import { DataFactory, Parser, Writer } from 'n3';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type * as Graph from './internal/graph.ts';
import * as Native from './internal/native.ts';
import { encodeDocument } from './internal/ntriples.ts';
import * as Quadstore from './internal/quadstore.ts';
import { clientLayer } from './internal/sqlite.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';
import * as Ontology from './Ontology.ts';

/**
 * The whole persistence surface of the index: a SQLite ledger of indexed files and a persistent RDF
 * quad store holding one named graph per file, plus SPARQL, LDkit and N3 reasoning over those
 * graphs. Nothing outside this module opens a database.
 *
 * Two quad-store backends sit behind the same interface (see `design/NATIVE-BACKEND.md`): `js`
 * (Quadstore over LevelDB, EYE for rules) and `native` (oxigraph plus an incremental rule engine,
 * from `tools/code-index-native`).
 */

export class StoreError extends Data.TaggedError('code-index/StoreError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type FileRecord = {
  readonly path: string;
  readonly language: string;
  readonly size: number;
  readonly hash: string;
  readonly mtime: number;
};

/** A file's ledger record and its document as N-Triples — what a worker sends back. */
export type EncodedDocument = FileRecord & {
  readonly triples: string;
};

/** What the ledger knows about a file — the incremental-indexing comparison key. */
export type FileState = FileRecord & {
  readonly graph: string;
};

export type FileFilter = {
  readonly language?: string;
};

export type Stats = {
  readonly dir: string;
  readonly files: number;
  readonly quads: number;
};

export type DerivedGraphCount = {
  readonly graph: string;
  readonly quads: number;
};

export type Binding = Graph.Binding;

export type ReasonOutcome = Graph.ReasonOutcome;

export type Backend = 'js' | 'native';

/** `CODE_INDEX_BACKEND=native` selects the native backend wherever a store is opened without one. */
export const defaultBackend = (): Backend => (process.env.CODE_INDEX_BACKEND === 'native' ? 'native' : 'js');

export type LayerOptions = {
  /**
   * Open an existing store for reading only: no migration, version reset or reconcile, since each
   * of those writes and a reader must not race the process indexing into the same store.
   */
  readonly readOnly?: boolean;
};

export type ReasonOptions = {
  /** Replace the reasoner's graph with this pass's conclusions (default false — derivations are returned only). */
  readonly materialize?: boolean;
};

export interface Api {
  readonly dir: string;

  // Ledger.
  readonly getFile: (path: string) => Effect.Effect<FileRecord | undefined, StoreError>;
  readonly listFiles: (filter?: FileFilter) => Effect.Effect<FileRecord[], StoreError>;
  /** Every committed file with its mtime — what an incremental pass diffs the working tree against. */
  readonly fileStates: () => Effect.Effect<FileState[], StoreError>;
  readonly getMeta: (key: string) => Effect.Effect<string | undefined, StoreError>;
  readonly setMeta: (key: string, value: string) => Effect.Effect<void, StoreError>;

  /**
   * Upsert one file: replaces its named graph with the document's quads and advances the ledger.
   * The ledger row is the commit marker, so a crash at any point leaves the previous revision live.
   */
  readonly putDocument: (document: Ontology.FileDocument) => Effect.Effect<void, StoreError>;
  /**
   * {@link Api.putDocument} for a batch already encoded (by a worker): the ledger is announced and
   * committed in one SQLite transaction each, around one graph swap of the whole batch, so a crash
   * costs at most the batch in flight.
   */
  readonly putDocuments: (documents: readonly EncodedDocument[]) => Effect.Effect<void, StoreError>;
  /** Drop a file's graph and ledger row (the file is gone from the working tree). */
  readonly removeFile: (path: string) => Effect.Effect<void, StoreError>;
  /** Discard graphs left behind by an interrupted commit. Runs automatically when the store opens. */
  readonly reconcile: () => Effect.Effect<number, StoreError>;

  // RDF graph.
  readonly putQuads: (quads: readonly Quad[]) => Effect.Effect<void, StoreError>;
  readonly delQuads: (quads: readonly Quad[]) => Effect.Effect<void, StoreError>;
  readonly match: (
    subject?: Quad_Subject,
    predicate?: Quad_Predicate,
    object?: Quad_Object,
    graph?: Quad_Graph,
  ) => Effect.Effect<Quad[], StoreError>;
  readonly select: (sparql: string) => Effect.Effect<Binding[], StoreError>;
  readonly ask: (sparql: string) => Effect.Effect<boolean, StoreError>;
  readonly construct: (sparql: string) => Effect.Effect<Quad[], StoreError>;
  /** Typed graph access — an LDkit lens bound to this store's quads. */
  readonly lens: <T extends LdkitSchema>(schema: T) => Lens<T>;
  readonly dump: () => Effect.Effect<string, StoreError>;
  readonly load: (turtle: string) => Effect.Effect<number, StoreError>;
  /**
   * Run N3 rules (EYE) over the asserted facts; returns the derived quads. `materialize` replaces
   * the derived graph with this pass's conclusions — derivations never outlive their premises.
   */
  readonly reason: (reasoner: string, rules: string, options?: ReasonOptions) => Effect.Effect<Quad[], StoreError>;
  /**
   * Run every reasoner in order, each replacing its own graph — what an indexing pass closes with.
   * The native backend maintains the graphs from the changes since the last call when the rule set
   * is the one they were computed with; see `design/NATIVE-BACKEND.md`.
   */
  readonly reasonAll: (reasoners: readonly Graph.ReasonerInput[]) => Effect.Effect<ReasonOutcome[], StoreError>;
  /** Replace a JS pass's graph with these conclusions; see `Ontology.passGraphIri`. */
  readonly writePass: (pass: string, quads: readonly Quad[]) => Effect.Effect<void, StoreError>;
  /** Every quad a reasoner concluded, as its graph currently stands. */
  readonly derived: (reasoner?: string) => Effect.Effect<Quad[], StoreError>;
  /** How many quads the reasoners' graphs hold, counted where they live rather than materialised. */
  readonly derivedCount: () => Effect.Effect<number, StoreError>;
  /** Each non-empty derived or pass graph with its quad count, in IRI order. */
  readonly derivedGraphCounts: () => Effect.Effect<DerivedGraphCount[], StoreError>;
  /** Advanced by every write to the facts; what a reasoning pass records it ran over. */
  readonly generation: () => Effect.Effect<number, StoreError>;
  /** Records that the reasoners `signature` names ran over the facts as of `generation`, deriving `derived` quads. */
  readonly recordReasoned: (signature: string, generation: number, derived: number) => Effect.Effect<void, StoreError>;
  /**
   * How many quads the reasoners `signature` names derived, if their conclusions are current: they
   * last ran over the facts the store holds now. `undefined` after any write since.
   */
  readonly reasoned: (signature: string) => Effect.Effect<number | undefined, StoreError>;

  readonly stats: () => Effect.Effect<Stats, StoreError>;
  readonly clear: () => Effect.Effect<void, StoreError>;
  readonly backend: Backend;
}

export class Store extends Context.Service<Store, Api>()('code-index/Store') {}

const SQLITE_FILE = 'index.sqlite';

/** The engine's own words, so a caller sees why a query or write failed and not only that it did. */
const detail = (cause: unknown): string | undefined =>
  cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : undefined;

const fail = (message: string) => (cause: unknown) => {
  const reason = detail(cause);
  return new StoreError({ message: reason ? `${message}: ${reason}` : message, cause });
};

const FILE_COLUMNS = 'path, language, size, hash, mtime';

const VERSION_KEY = 'ontologyVersion';

/** Advanced by every write, before it lands, so a reasoning pass can tell its premises moved since. */
const GENERATION_KEY = 'generation';

/** {@link Reasoned} of the last completed reasoning pass — see {@link Api.isReasoned}. */
const REASONED_KEY = 'reasoned';

const Reasoned = Schema.fromJsonString(
  Schema.Struct({ signature: Schema.String, generation: Schema.Number, derived: Schema.Number }),
);

/** The derived graphs any reasoning has written, so they are counted without scanning the store. */
const DERIVED_GRAPHS_KEY = 'derivedGraphs';

const DerivedGraphs = Schema.fromJsonString(Schema.Array(Schema.String));

/**
 * Empty a store written under another {@link Ontology.VERSION} before the graph opens, so the next
 * pass reindexes everything. The version is recorded last: a crash part-way leaves it unset and
 * the next open simply resets again.
 */
const resetIfStale = (dir: string): Effect.Effect<void, StoreError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const [row] = yield* sql<{ value: string }>`SELECT value FROM meta WHERE key = ${VERSION_KEY}`.pipe(
      Effect.mapError(fail('Failed to read store version')),
    );
    const version = String(Ontology.VERSION);
    if (row?.value === version) {
      return;
    }
    // Both backends' directories go, so switching backend after an upgrade cannot revive old graphs.
    for (const graphDir of [Quadstore.DIR, Native.DIR]) {
      yield* Effect.tryPromise({
        try: () => rm(join(dir, graphDir), { recursive: true, force: true }),
        catch: fail('Failed to drop stale graph'),
      });
    }
    yield* sql`DELETE FROM files`.pipe(Effect.mapError(fail('Failed to drop stale ledger')));
    yield* sql`DELETE FROM meta`.pipe(Effect.mapError(fail('Failed to drop stale meta')));
    yield* sql`INSERT INTO meta (key, value) VALUES (${VERSION_KEY}, ${version})`.pipe(
      Effect.mapError(fail('Failed to record store version')),
    );
  });

/** A reader cannot reset a stale store, so it refuses one rather than answering from old graphs. */
const requireCurrent = (dir: string): Effect.Effect<void, StoreError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const [row] = yield* sql<{ value: string }>`SELECT value FROM meta WHERE key = ${VERSION_KEY}`.pipe(
      Effect.mapError(fail('Failed to read store version')),
    );
    if (row?.value !== String(Ontology.VERSION)) {
      return yield* Effect.fail(
        new StoreError({
          message: `The store at ${dir} was written by ontology version ${row?.value ?? 'unknown'}, not ${Ontology.VERSION}; run \`code-index index\` to rebuild it.`,
        }),
      );
    }
  });

const make = (
  dir: string,
  backend: Backend,
  readOnly: boolean,
): Effect.Effect<Api, StoreError, SqlClient.SqlClient | Scope.Scope> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    if (readOnly) {
      yield* requireCurrent(dir);
    } else {
      // WAL with FULL fsyncs every commit; NORMAL fsyncs at checkpoints and still survives a process
      // crash at any point. Only an OS crash can lose the last commits, and the quad stores (RocksDB,
      // LevelDB) never fsync their own writes, so FULL bought no durability the graphs had.
      yield* sql`PRAGMA synchronous = NORMAL`.pipe(Effect.mapError(fail('Failed to configure ledger')));
      yield* Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
        // A schema the store cannot create is a construction failure, not something a caller recovers from.
        Effect.orDie,
      );
      yield* resetIfStale(dir);
    }

    const graphs: Graph.Graph<StoreError> = yield* backend === 'native'
      ? Native.make(dir, fail)
      : Quadstore.make(dir, fail);
    const { match } = graphs;

    const getMeta: Api['getMeta'] = (key) =>
      sql<{ value: string }>`SELECT value FROM meta WHERE key = ${key}`.pipe(
        Effect.map((rows) => rows[0]?.value),
        Effect.mapError(fail('Failed to read meta')),
      );

    const setMeta: Api['setMeta'] = (key, value) =>
      sql`INSERT INTO meta (key, value) VALUES (${key}, ${value})
          ON CONFLICT (key) DO UPDATE SET value = excluded.value`.pipe(
        Effect.asVoid,
        Effect.mapError(fail('Failed to write meta')),
      );

    const readMeta = <T>(key: string, schema: Schema.Codec<T, string>): Effect.Effect<T | undefined, StoreError> =>
      Effect.flatMap(getMeta(key), (value) =>
        value === undefined
          ? Effect.succeed(undefined)
          : Schema.decodeUnknownEffect(schema)(value).pipe(Effect.mapError(fail(`Corrupt meta entry: ${key}`))),
      );

    // Commits from concurrent batches would otherwise interleave inside each other's transactions.
    const writeLock = yield* Semaphore.make(1);
    const exclusive = <A>(effect: Effect.Effect<A, StoreError>): Effect.Effect<A, StoreError> =>
      writeLock.withPermits(1)(effect);
    const transaction = <A>(effect: Effect.Effect<A, StoreError>): Effect.Effect<A, StoreError> =>
      sql
        .withTransaction(effect)
        .pipe(
          Effect.mapError((error) =>
            error instanceof StoreError
              ? error
              : new StoreError({ message: 'Ledger transaction failed', cause: error }),
          ),
        );

    const generation = (): Effect.Effect<number, StoreError> =>
      Effect.map(getMeta(GENERATION_KEY), (value) => Number(value ?? 0));

    // Kept in the ledger rather than in memory, so it holds whoever wrote last. It moves before the
    // write it covers: a crash between the two leaves the conclusions marked stale, never current.
    const advance = (): Effect.Effect<void, StoreError> =>
      sql`INSERT INTO meta (key, value) VALUES (${GENERATION_KEY}, '1')
          ON CONFLICT (key) DO UPDATE SET value = CAST(value AS INTEGER) + 1`.pipe(
        Effect.asVoid,
        Effect.mapError(fail('Failed to advance the store generation')),
      );

    const derivedGraphs = (): Effect.Effect<readonly string[], StoreError> =>
      Effect.map(readMeta(DERIVED_GRAPHS_KEY, DerivedGraphs), (names) => names ?? []);

    // Recorded before the graphs are written, so a crash cannot leave a derived graph uncounted.
    const recordDerived = (names: readonly string[]): Effect.Effect<void, StoreError> =>
      Effect.gen(function* () {
        const known = yield* derivedGraphs();
        const merged = [...new Set([...known, ...names])];
        if (merged.length !== known.length) {
          yield* setMeta(
            DERIVED_GRAPHS_KEY,
            yield* Schema.encodeEffect(DerivedGraphs)(merged).pipe(
              Effect.mapError(fail('Failed to record derived graphs')),
            ),
          );
        }
      });

    const serialize = (quads: readonly Quad[]): Effect.Effect<string, StoreError> =>
      Effect.callback<string, StoreError>((resume) => {
        const writer = new Writer({ prefixes: Ontology.prefixes, format: 'text/n3' });
        writer.addQuads(quads.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object)));
        writer.end((error, result) =>
          resume(
            error
              ? Effect.fail(new StoreError({ message: 'Failed to serialize graph', cause: error }))
              : Effect.succeed(result),
          ),
        );
      });

    const dump: Api['dump'] = () => Effect.flatMap(match(), serialize);

    const reconcile: Api['reconcile'] = () =>
      Effect.gen(function* () {
        const pending = yield* sql<{
          path: string;
          graph: string;
          pending_graph: string;
        }>`SELECT path, graph, pending_graph FROM files WHERE pending_graph IS NOT NULL`.pipe(
          Effect.mapError(fail('Failed to read pending commits')),
        );
        for (const row of pending) {
          yield* graphs.drop(row.pending_graph);
          if (row.graph === row.pending_graph) {
            // A file's *first* commit, interrupted: the row announced the graph it was about to
            // write and is the same row that claims it live, at the mtime it was written for. Just
            // clearing `pending_graph` would leave a row asserting it is current with no facts at
            // all — and an incremental pass, seeing the mtime match, would never reindex it. The
            // row goes with the graph, so the next pass treats the file as new.
            yield* sql`DELETE FROM files WHERE path = ${row.path}`.pipe(
              Effect.mapError(fail('Failed to discard an unfinished first commit')),
            );
          } else {
            yield* sql`UPDATE files SET pending_graph = NULL WHERE path = ${row.path}`.pipe(
              Effect.mapError(fail('Failed to clear pending commit')),
            );
          }
        }
        return pending.length;
      });

    if (!readOnly) {
      yield* reconcile();
    }

    const putDocuments: Api['putDocuments'] = (documents) =>
      documents.length === 0
        ? Effect.void
        : exclusive(
            Effect.gen(function* () {
              // The batch is one graph swap, so a path named twice keeps only its last revision.
              const latest = [...new Map(documents.map((document) => [document.path, document])).values()];
              // 1. Announce every write in the batch. A crash from here on leaves each previous graph
              //    live and each new one reachable only through `pending_graph`, which `reconcile`
              //    deletes on the next open.
              const plans = yield* transaction(
                Effect.andThen(
                  advance(),
                  Effect.forEach(latest, (document) =>
                    Effect.gen(function* () {
                      const graph = Ontology.graphIri(document.path, document.mtime);
                      const [current] = yield* sql<{
                        graph: string;
                      }>`SELECT graph FROM files WHERE path = ${document.path}`.pipe(
                        Effect.mapError(fail('Failed to read ledger')),
                      );
                      yield* sql`INSERT INTO files (path, language, size, hash, mtime, graph, pending_graph)
                               VALUES (${document.path}, ${document.language}, ${document.size}, ${document.hash},
                                       ${document.mtime}, ${current?.graph ?? graph.value}, ${graph.value})
                               ON CONFLICT (path) DO UPDATE SET pending_graph = excluded.pending_graph`.pipe(
                        Effect.mapError(fail('Failed to begin file commit')),
                      );
                      return { document, graph, current: current?.graph };
                    }),
                  ),
                ),
              );

              // 2. Swap every file's graphs in one backend batch. Both the live graph and the target are
              //    cleared: a reindex at an unchanged mtime targets the graph it is replacing, and
              //    merging into it would leave the previous revision's quads behind forever.
              yield* graphs.swap(
                plans.map(({ document, graph, current }) => ({
                  clear: [...new Set([current, graph.value].filter((value) => value !== undefined))],
                  graph: graph.value,
                  triples: document.triples,
                })),
              );

              // 3. Commit: the ledger rows are what make the new graphs the live ones.
              yield* transaction(
                Effect.forEach(
                  plans,
                  ({ document, graph }) =>
                    sql`UPDATE files SET language = ${document.language}, size = ${document.size},
                          hash = ${document.hash}, mtime = ${document.mtime}, graph = ${graph.value},
                          pending_graph = NULL
                        WHERE path = ${document.path}`.pipe(Effect.mapError(fail('Failed to commit file'))),
                  { discard: true },
                ),
              );
            }),
          );

    const removeFile: Api['removeFile'] = (path) =>
      exclusive(
        Effect.gen(function* () {
          const [current] = yield* sql<{ graph: string }>`SELECT graph FROM files WHERE path = ${path}`.pipe(
            Effect.mapError(fail('Failed to read ledger')),
          );
          if (!current) {
            return;
          }
          yield* advance();
          // The graph is announced as pending *before* the row goes, so a crash between the two
          // leaves it reachable through `pending_graph` and `reconcile` drops it on the next open.
          // The row alone is not enough: `reconcile` scans pending rows, not the quad store, so a
          // graph whose row is already gone would never be found — and its quads keep answering
          // queries through the union default graph, making a deleted file's facts immortal.
          yield* sql`UPDATE files SET pending_graph = ${current.graph} WHERE path = ${path}`.pipe(
            Effect.mapError(fail('Failed to begin file removal')),
          );
          yield* graphs.drop(current.graph);
          // A row without a graph would be a phantom file, so it goes last.
          yield* sql`DELETE FROM files WHERE path = ${path}`.pipe(Effect.mapError(fail('Failed to delete ledger row')));
        }),
      );

    const derivedGraphCounts: Api['derivedGraphCounts'] = () =>
      Effect.flatMap(derivedGraphs(), (names) =>
        Effect.map(
          Effect.forEach([...names].sort(), (graph) =>
            Effect.map(graphs.countGraph(graph), (quads) => ({ graph, quads })),
          ),
          (counts) => counts.filter((count) => count.quads > 0),
        ),
      );

    const derivedCount: Api['derivedCount'] = () =>
      Effect.map(derivedGraphCounts(), (counts) => counts.reduce((total, count) => total + count.quads, 0));

    return {
      dir,

      getFile: (path) =>
        sql<FileRecord>`SELECT ${sql.literal(FILE_COLUMNS)} FROM files WHERE path = ${path}`.pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(fail('Failed to read file record')),
        ),

      listFiles: (filter) =>
        (filter?.language
          ? sql<FileRecord>`SELECT ${sql.literal(FILE_COLUMNS)} FROM files WHERE language = ${filter.language} ORDER BY path`
          : sql<FileRecord>`SELECT ${sql.literal(FILE_COLUMNS)} FROM files ORDER BY path`
        ).pipe(
          Effect.map((rows) => [...rows]),
          Effect.mapError(fail('Failed to list file records')),
        ),

      fileStates: () =>
        sql<FileState>`SELECT ${sql.literal(FILE_COLUMNS)}, graph FROM files ORDER BY path`.pipe(
          Effect.map((rows) => [...rows]),
          Effect.mapError(fail('Failed to read ledger')),
        ),

      getMeta,
      setMeta,

      putDocument: (document) => putDocuments([encodeDocument(document)]),
      putDocuments,
      removeFile,
      reconcile,
      putQuads: (quads) => exclusive(Effect.andThen(advance(), graphs.putQuads(quads))),
      delQuads: (quads) => exclusive(Effect.andThen(advance(), graphs.delQuads(quads))),
      match,
      select: graphs.select,
      ask: graphs.ask,
      construct: graphs.construct,
      lens: graphs.lens,

      dump,

      load: (turtle) =>
        Effect.gen(function* () {
          const quads = yield* Effect.try({
            try: () => new Parser({ format: 'text/n3' }).parse(turtle),
            catch: fail('Failed to parse graph'),
          });
          yield* exclusive(Effect.andThen(advance(), graphs.putQuads(quads)));
          return quads.length;
        }),

      reason: (reasoner, rules, options) =>
        options?.materialize
          ? exclusive(
              Effect.gen(function* () {
                const graph = Ontology.derivedGraphIri(reasoner);
                // One graph replaced on its own is not a pass of the whole rule set.
                yield* advance();
                yield* recordDerived([graph.value]);
                return yield* graphs.reason(graph, rules, true);
              }),
            )
          : graphs.reason(Ontology.derivedGraphIri(reasoner), rules, false),

      reasonAll: (reasoners) =>
        exclusive(
          Effect.gen(function* () {
            yield* recordDerived(reasoners.map((reasoner) => Ontology.derivedGraphIri(reasoner.name).value));
            return yield* graphs.reasonAll(reasoners);
          }),
        ),

      writePass: (pass, quads) =>
        exclusive(
          Effect.gen(function* () {
            const graph = Ontology.passGraphIri(pass);
            yield* recordDerived([graph.value]);
            const stale = yield* match(undefined, undefined, undefined, graph);
            const next = quads.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
            // Only the difference is written, so the native journal sees what actually changed.
            const key = (quad: Quad) =>
              JSON.stringify([
                quad.subject.value,
                quad.predicate.value,
                quad.object.termType,
                quad.object.value,
                quad.object.termType === 'Literal' ? [quad.object.datatype.value, quad.object.language] : [],
              ]);
            const kept = new Set(next.map(key));
            const had = new Set(stale.map(key));
            yield* graphs.delQuads(stale.filter((quad) => !kept.has(key(quad))));
            yield* graphs.putQuads(next.filter((quad) => !had.has(key(quad))));
          }),
        ),

      derived: (reasoner) =>
        reasoner === undefined
          ? Effect.flatMap(derivedGraphs(), (names) =>
              Effect.map(
                Effect.forEach(names, (name) => match(undefined, undefined, undefined, DataFactory.namedNode(name))),
                (quads) => quads.flat(),
              ),
            )
          : match(undefined, undefined, undefined, Ontology.derivedGraphIri(reasoner)),

      derivedCount,
      derivedGraphCounts,

      generation,

      recordReasoned: (signature, generation, derived) =>
        Effect.flatMap(
          Schema.encodeEffect(Reasoned)({ signature, generation, derived }).pipe(
            Effect.mapError(fail('Failed to record the reasoning pass')),
          ),
          (reasoned) => setMeta(REASONED_KEY, reasoned),
        ),

      reasoned: (signature) =>
        Effect.gen(function* () {
          // A marker from before it recorded a count, or one that no longer decodes, is just stale.
          const reasoned = yield* readMeta(REASONED_KEY, Reasoned).pipe(Effect.orElseSucceed(() => undefined));
          return reasoned !== undefined &&
            reasoned.generation === (yield* generation()) &&
            reasoned.signature === signature
            ? reasoned.derived
            : undefined;
        }),

      stats: () =>
        Effect.gen(function* () {
          const [{ count }] = yield* sql<{
            count: number;
          }>`SELECT COUNT(*) AS count FROM files`.pipe(Effect.mapError(fail('Failed to count files')));
          return { dir, files: count, quads: yield* graphs.count() };
        }),

      clear: () =>
        exclusive(
          Effect.gen(function* () {
            yield* advance();
            yield* sql`DELETE FROM files`.pipe(Effect.mapError(fail('Failed to clear ledger')));
            yield* graphs.clear();
          }),
        ),
      backend,
    } satisfies Api;
  });

/**
 * Opens (creating if absent, unless `readOnly`) the store rooted at `dir`; each database is a file
 * or directory inside it. Scoped — both databases close when the enclosing scope ends.
 */
export const layer = (
  dir: string,
  backend: Backend = defaultBackend(),
  options: LayerOptions = {},
): Layer.Layer<Store, StoreError> => {
  const readOnly = options.readOnly ?? false;
  const prepare = readOnly
    ? existsSync(join(dir, SQLITE_FILE))
      ? Effect.void
      : Effect.fail(new StoreError({ message: `No index at ${dir}; run \`code-index index\` first.` }))
    : Effect.tryPromise({
        try: () => mkdir(dir, { recursive: true }),
        catch: fail('Failed to create store directory'),
      }).pipe(Effect.asVoid);
  return Layer.unwrap(
    Effect.map(prepare, () =>
      Layer.effect(Store, make(dir, backend, readOnly)).pipe(
        Layer.provide(clientLayer(join(dir, SQLITE_FILE), { readonly: readOnly })),
      ),
    ),
  );
};
