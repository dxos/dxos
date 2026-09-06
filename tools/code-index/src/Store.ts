//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type { Bindings, Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject, ResultStream } from '@rdfjs/types';
import { ClassicLevel } from 'classic-level';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { n3reasoner } from 'eyereasoner';
import { JsonLdParser } from 'jsonld-streaming-parser';
import { type Options as LdkitOptions, type Lens, type Schema, createLens } from 'ldkit';
import { DataFactory, Parser, Writer } from 'n3';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Quadstore } from 'quadstore';
import { Engine } from 'quadstore-comunica';

import { clientLayer } from './internal/sqlite.ts';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.ts';
import * as Ontology from './Ontology.ts';

/**
 * The whole persistence surface of the index: a SQLite ledger of indexed files and a persistent RDF
 * quad store (Quadstore over LevelDB) holding one named graph per file, plus SPARQL, LDkit and N3
 * reasoning over those graphs. Nothing outside this module opens a database.
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

export type Binding = Record<string, string>;

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
  readonly lens: <T extends Schema>(schema: T) => Lens<T>;
  readonly dump: () => Effect.Effect<string, StoreError>;
  readonly load: (turtle: string) => Effect.Effect<number, StoreError>;
  /**
   * Run N3 rules (EYE) over the asserted facts; returns the derived quads. `materialize` replaces
   * the derived graph with this pass's conclusions — derivations never outlive their premises.
   */
  readonly reason: (reasoner: string, rules: string, options?: ReasonOptions) => Effect.Effect<Quad[], StoreError>;
  /** Every quad a reasoner concluded, as its graph currently stands. */
  readonly derived: (reasoner?: string) => Effect.Effect<Quad[], StoreError>;

  readonly stats: () => Effect.Effect<Stats, StoreError>;
  readonly clear: () => Effect.Effect<void, StoreError>;
}

export class Store extends Context.Service<Store, Api>()('code-index/Store') {}

const SQLITE_FILE = 'index.sqlite';
const GRAPH_DIR = 'graph';

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

const tryStore = <A>(message: string, thunk: () => Promise<A>): Effect.Effect<A, StoreError> =>
  Effect.tryPromise({ try: thunk, catch: fail(message) });

// Comunica result streams are typed as bare EventEmitters, so they are drained by event rather than
// through the `toArray` the concrete implementation happens to have.
const collect = <T>(stream: ResultStream<T>): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const items: T[] = [];
    stream.on('data', (item: T) => items.push(item));
    stream.on('error', reject);
    stream.on('end', () => resolve(items));
  });

/**
 * The predicates a rule set matches on, or `undefined` if any rule leaves a predicate unbound (in
 * which case no narrowing is sound and the whole graph has to go in).
 */
const predicatesOf = (rules: string): Set<string> | undefined => {
  const parsed = new Parser({ format: 'text/n3' }).parse(rules);
  const predicates = new Set<string>();
  for (const quad of parsed) {
    if (quad.predicate.termType !== 'NamedNode') {
      return undefined;
    }
    predicates.add(quad.predicate.value);
  }
  return predicates;
};

const parseJsonLd = (document: Ontology.FileDocument, graph: Quad_Graph): Promise<Quad[]> =>
  new Promise((resolve, reject) => {
    const parser = new JsonLdParser();
    const quads: Quad[] = [];
    // The parser emits into the default graph; every quad is re-homed into the file's own graph.
    parser.on('data', (quad: Quad) => quads.push(DataFactory.quad(quad.subject, quad.predicate, quad.object, graph)));
    parser.on('error', reject);
    parser.on('end', () => resolve(quads));
    parser.write(JSON.stringify(document));
    parser.end();
  });

const FILE_COLUMNS = 'path, language, size, hash, mtime';

const make = (dir: string): Effect.Effect<Api, StoreError, SqlClient.SqlClient | Scope.Scope> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
      // A schema the store cannot create is a construction failure, not something a caller recovers from.
      Effect.orDie,
    );

    const backend = new ClassicLevel(join(dir, GRAPH_DIR));
    const quadstore = new Quadstore({ backend, dataFactory: DataFactory });
    yield* Effect.acquireRelease(
      tryStore('Failed to open graph', () => quadstore.open()),
      () => Effect.orDie(tryStore('Failed to close graph', () => quadstore.close())),
    );
    const engine = new Engine(quadstore);
    // Every file lives in its own named graph, so queries treat the default graph as their union —
    // otherwise a SPARQL pattern without an explicit GRAPH clause would match nothing.
    const context = { unionDefaultGraph: true };
    const ldkit: LdkitOptions = { sources: [quadstore], engine, ...context };

    const putQuads: Api['putQuads'] = (quads) =>
      quads.length === 0
        ? Effect.void
        : tryStore('Failed to write quads', () => quadstore.multiPut([...quads]).then(() => undefined));

    const match: Api['match'] = (subject, predicate, object, graph) =>
      tryStore('Failed to match quads', async () => {
        const { items } = await quadstore.get({ subject, predicate, object, graph });
        return items;
      });

    /** Swap a graph's contents in one backend batch: nothing observes a half-written graph. */
    const patchGraph = (previous: Quad[], next: readonly Quad[]): Effect.Effect<void, StoreError> =>
      tryStore('Failed to patch graph', () => quadstore.multiPatch(previous, [...next]).then(() => undefined));

    const dropGraph = (graph: string): Effect.Effect<void, StoreError> =>
      Effect.flatMap(match(undefined, undefined, undefined, DataFactory.namedNode(graph)), (quads) =>
        quads.length === 0
          ? Effect.void
          : tryStore('Failed to drop graph', () => quadstore.multiDel(quads).then(() => undefined)),
      );

    /** Everything the indexer asserted — the file graphs, without anything rules derived. */
    /**
     * The premises a rule set can actually use: asserted facts, narrowed to the predicates the
     * rules mention. Handing EYE the whole graph made the reasoning phase cost more than the rest
     * of an indexing pass by two orders of magnitude, for facts no rule could match.
     */
    const facts = (rules: string, ownGraph: string): Effect.Effect<Quad[], StoreError> =>
      Effect.gen(function* () {
        const wanted = predicatesOf(rules);
        const quads = yield* match();
        // A reasoner sees the file graphs and every other reasoner's conclusions, but never its own:
        // reading its own output back would let a derivation keep itself alive.
        return quads.filter(
          (quad) => quad.graph.value !== ownGraph && (wanted === undefined || wanted.has(quad.predicate.value)),
        );
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
          pending_graph: string;
        }>`SELECT path, pending_graph FROM files WHERE pending_graph IS NOT NULL`.pipe(
          Effect.mapError(fail('Failed to read pending commits')),
        );
        for (const row of pending) {
          yield* dropGraph(row.pending_graph);
          yield* sql`UPDATE files SET pending_graph = NULL WHERE path = ${row.path}`.pipe(
            Effect.mapError(fail('Failed to clear pending commit')),
          );
        }
        return pending.length;
      });

    yield* reconcile();

    const putDocument: Api['putDocument'] = (document) =>
      Effect.gen(function* () {
        const graph = Ontology.graphIri(document.path, document.mtime);
        const quads = yield* tryStore('Failed to parse document', () => parseJsonLd(document, graph));

        const [current] = yield* sql<{ graph: string }>`SELECT graph FROM files WHERE path = ${document.path}`.pipe(
          Effect.mapError(fail('Failed to read ledger')),
        );

        // 1. Announce the write. A crash from here on leaves the previous graph live and the new one
        //    reachable only through `pending_graph`, which `reconcile` deletes on the next open.
        yield* sql`INSERT INTO files (path, language, size, hash, mtime, graph, pending_graph)
                   VALUES (${document.path}, ${document.language}, ${document.size}, ${document.hash},
                           ${document.mtime}, ${current?.graph ?? graph.value}, ${graph.value})
                   ON CONFLICT (path) DO UPDATE SET pending_graph = excluded.pending_graph`.pipe(
          Effect.mapError(fail('Failed to begin file commit')),
        );

        // 2. Swap the graphs in one backend batch.
        const previous = current
          ? yield* match(undefined, undefined, undefined, DataFactory.namedNode(current.graph))
          : [];
        yield* patchGraph(current && current.graph !== graph.value ? previous : [], quads);

        // 3. Commit: the ledger row is what makes the new graph the live one.
        yield* sql`UPDATE files SET language = ${document.language}, size = ${document.size},
                     hash = ${document.hash}, mtime = ${document.mtime}, graph = ${graph.value},
                     pending_graph = NULL
                   WHERE path = ${document.path}`.pipe(Effect.mapError(fail('Failed to commit file')));
      });

    const removeFile: Api['removeFile'] = (path) =>
      Effect.gen(function* () {
        const [current] = yield* sql<{ graph: string }>`SELECT graph FROM files WHERE path = ${path}`.pipe(
          Effect.mapError(fail('Failed to read ledger')),
        );
        if (!current) {
          return;
        }
        // The row goes first: a graph without a row is garbage `reconcile` can spot, a row without a
        // graph would be a phantom file.
        yield* sql`DELETE FROM files WHERE path = ${path}`.pipe(Effect.mapError(fail('Failed to delete ledger row')));
        yield* dropGraph(current.graph);
      });

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

      getMeta: (key) =>
        sql<{ value: string }>`SELECT value FROM meta WHERE key = ${key}`.pipe(
          Effect.map((rows) => rows[0]?.value),
          Effect.mapError(fail('Failed to read meta')),
        ),

      setMeta: (key, value) =>
        sql`INSERT INTO meta (key, value) VALUES (${key}, ${value})
            ON CONFLICT (key) DO UPDATE SET value = excluded.value`.pipe(
          Effect.asVoid,
          Effect.mapError(fail('Failed to write meta')),
        ),

      putDocument,
      removeFile,
      reconcile,
      putQuads,

      delQuads: (quads) =>
        quads.length === 0
          ? Effect.void
          : tryStore('Failed to delete quads', () => quadstore.multiDel([...quads]).then(() => undefined)),

      match,

      select: (sparql) =>
        tryStore('Failed to run SPARQL SELECT', async () => {
          const rows = await collect<Bindings>(await engine.queryBindings(sparql, context));
          return rows.map((row) => Object.fromEntries([...row].map(([key, term]) => [key.value, term.value])));
        }),

      ask: (sparql) => tryStore('Failed to run SPARQL ASK', () => engine.queryBoolean(sparql, context)),

      construct: (sparql) =>
        tryStore('Failed to run SPARQL CONSTRUCT', () => engine.queryQuads(sparql, context).then(collect<Quad>)),

      lens: (schema) => createLens(schema, ldkit),

      dump,

      load: (turtle) =>
        Effect.gen(function* () {
          const quads = yield* Effect.try({
            try: () => new Parser({ format: 'text/n3' }).parse(turtle),
            catch: fail('Failed to parse graph'),
          });
          yield* putQuads(quads);
          return quads.length;
        }),

      reason: (reasoner, rules, options) =>
        Effect.gen(function* () {
          const graph = Ontology.derivedGraphIri(reasoner);
          const data = yield* serialize(yield* facts(rules, graph.value));
          const derived = yield* tryStore('Reasoning failed', () =>
            n3reasoner([data, rules].join('\n'), undefined, { output: 'derivations' }),
          );
          const parsed = yield* Effect.try({
            try: () => new Parser({ format: 'text/n3' }).parse(typeof derived === 'string' ? derived : ''),
            catch: fail('Failed to parse derivations'),
          });
          const quads = parsed.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
          if (options?.materialize) {
            // The reasoner's whole graph is replaced in one batch, so conclusions are either the
            // ones this pass entailed or none at all — never a mix of two generations.
            yield* patchGraph(yield* match(undefined, undefined, undefined, graph), quads);
          }
          return quads;
        }),

      derived: (reasoner) =>
        reasoner === undefined
          ? Effect.map(match(), (quads) => quads.filter((quad) => Ontology.isDerivedGraph(quad.graph.value)))
          : match(undefined, undefined, undefined, Ontology.derivedGraphIri(reasoner)),

      stats: () =>
        Effect.gen(function* () {
          const [{ count }] = yield* sql<{
            count: number;
          }>`SELECT COUNT(*) AS count FROM files`.pipe(Effect.mapError(fail('Failed to count files')));
          const quads = yield* match();
          return { dir, files: count, quads: quads.length };
        }),

      clear: () =>
        Effect.gen(function* () {
          yield* sql`DELETE FROM files`.pipe(Effect.mapError(fail('Failed to clear ledger')));
          const quads = yield* match();
          if (quads.length > 0) {
            yield* tryStore('Failed to clear graph', () => quadstore.multiDel(quads).then(() => undefined));
          }
        }),
    } satisfies Api;
  });

/**
 * Opens (creating if absent) the store rooted at `dir`; each database is a file or directory inside
 * it. Scoped — both databases close when the enclosing scope ends.
 */
export const layer = (dir: string): Layer.Layer<Store, StoreError> =>
  Layer.unwrap(
    Effect.map(
      Effect.tryPromise({
        try: () => mkdir(dir, { recursive: true }),
        catch: fail('Failed to create store directory'),
      }),
      () => Layer.effect(Store, make(dir)).pipe(Layer.provide(clientLayer(join(dir, SQLITE_FILE)))),
    ),
  );
