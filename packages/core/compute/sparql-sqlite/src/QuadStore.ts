//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Latch from 'effect/Latch';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';

import { BaseError } from '@dxos/errors';

import { runEffect } from './effect-driver.ts';
import { EngineCore } from './engine.ts';
import { parseSparql } from './parser.ts';
import { type Program, exec, raw, rows } from './program.ts';
import { type Quad, type Row, type Term } from './terms.ts';

/** A store operation failed: the log, the SQL, or a query that is not a read; the message says which. */
export class QuadStoreError extends BaseError.extend('QuadStoreError', 'Quad store operation failed.') {}

/** One change to the store. */
export type Write =
  | { readonly _tag: 'insert'; readonly quads: readonly Quad[] }
  | { readonly _tag: 'delete'; readonly quads: readonly Quad[] }
  | { readonly _tag: 'clear' };

/** Writes recorded in the log together, and applied together in one transaction. */
export type Batch = { readonly id: string; readonly writes: readonly Write[] };

/**
 * The durable, replicated record of the store's writes: the store appends to it first and applies what it reads back,
 * so the store is a cache of the log, rebuilt from it when empty.
 */
export interface QuadLog {
  readonly append: (batch: Batch) => Effect.Effect<void, unknown>;
  /** The batches after `cursor` (all when undefined), in log order, and the cursor to read on from. */
  readonly read: (
    cursor: string | undefined,
  ) => Effect.Effect<{ batches: readonly Batch[]; next: string | undefined }, unknown>;
  /** Calls `onChange` whenever batches may have been added, by this store or another replica, until the scope closes. */
  readonly listen: (onChange: () => void) => Effect.Effect<void, never, Scope.Scope>;
}

export type WriteOptions = {
  /** Writes to the store's local part: never logged or replicated, and kept by a logged `clear`. */
  readonly local?: boolean;
};

export type QueryOptions = {
  /** Reads the store's local part instead of the logged one. */
  readonly local?: boolean;
};

export interface QuadStore {
  /** Runs a SPARQL read (SELECT, ASK or CONSTRUCT); an update fails, since writes go through {@link write}. */
  readonly query: (sparql: string, options?: QueryOptions) => Effect.Effect<Row[], QuadStoreError>;
  /** Logs the writes (unless local), applies them, and returns the batch id. */
  readonly write: (writes: readonly Write[], options?: WriteOptions) => Effect.Effect<string, QuadStoreError>;
  /** Every quad of the logged part, the default graph's with no `g`. */
  readonly quads: () => Effect.Effect<Quad[], QuadStoreError>;
  /**
   * Calls `onApplied` with each logged batch once it is applied, this store's and other replicas' alike, in log order,
   * until the scope closes.
   */
  readonly listen: (onApplied: (batch: Batch) => void) => Effect.Effect<void, never, Scope.Scope>;
}

export type Options = {
  /** Prefix of every table the store owns, so several stores share one database (default none). */
  readonly prefix?: string;
  /** The log writes go to first; without one, writes apply directly. */
  readonly log?: QuadLog;
};

const LOG_CURSOR = 'log_cursor';

/**
 * Opens a store over the async `SqlClient` in context: a logged part (written through the log, replicated, rebuilt
 * from it) and a local part (written directly, per device). Operations run one at a time; each logged batch is applied
 * in one transaction with the log cursor, so a crash never applies a batch twice or skips one.
 */
export const make = ({ prefix = '', log }: Options = {}): Effect.Effect<
  QuadStore,
  never,
  SqlClient.SqlClient | Scope.Scope
> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const main = new EngineCore({ prefix });
    const local = new EngineCore({ prefix: `${prefix}local_` });
    const state = `${prefix}store_state`;
    const lock = yield* Semaphore.make(1);
    const listeners = new Set<(batch: Batch) => void>();

    const run = <A>(program: Program<A>, message: string) =>
      runEffect(program, (cause) => new QuadStoreError({ message, cause })).pipe(
        Effect.mapError((error) =>
          error instanceof QuadStoreError ? error : new QuadStoreError({ message, cause: error }),
        ),
        Effect.provideService(SqlClient.SqlClient, sql),
      );

    const transaction = <A>(effect: Effect.Effect<A, QuadStoreError>) =>
      sql
        .withTransaction(effect)
        .pipe(
          Effect.mapError((error) =>
            error instanceof QuadStoreError
              ? error
              : new QuadStoreError({ message: 'Transaction failed', cause: error }),
          ),
        );

    function* applyWrites(engine: EngineCore, writes: readonly Write[]): Program<void> {
      for (const write of writes) {
        switch (write._tag) {
          case 'insert':
            yield* engine.insert(write.quads);
            break;
          case 'delete':
            yield* engine.delete(write.quads);
            break;
          case 'clear':
            yield* engine.reset();
            break;
        }
      }
    }

    function* readCursor(): Program<string | undefined> {
      const [row] = yield* rows(`SELECT v FROM ${state} WHERE k = ?`, LOG_CURSOR);
      return typeof row?.v === 'string' ? row.v : undefined;
    }

    function* applyBatch(batch: Batch, cursor: string | undefined): Program<void> {
      yield* applyWrites(main, batch.writes);
      if (cursor !== undefined) {
        yield* exec(
          `INSERT INTO ${state} (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`,
          LOG_CURSOR,
          cursor,
        );
      }
    }

    const notify = (batch: Batch) => listeners.forEach((listener) => listener(batch));

    /** Applies the log's batches after the stored cursor, each in one transaction with the cursor it ends at. */
    const catchUp = (quadLog: QuadLog) =>
      Effect.gen(function* () {
        const cursor = yield* run(readCursor(), 'Failed to read the log cursor');
        const page = yield* quadLog
          .read(cursor)
          .pipe(Effect.mapError((cause) => new QuadStoreError({ message: 'Failed to read the log', cause })));
        for (const [index, batch] of page.batches.entries()) {
          const last = index === page.batches.length - 1;
          yield* transaction(run(applyBatch(batch, last ? page.next : undefined), 'Failed to apply a batch'));
          notify(batch);
        }
      });

    yield* run(
      (function* () {
        yield* main.init();
        yield* local.init();
        yield* exec(`CREATE TABLE IF NOT EXISTS ${state} (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
      })(),
      'Failed to initialize the store',
    ).pipe(Effect.orDie);

    if (log) {
      // Listening before the first read means no batch lands between them unseen.
      const signal = yield* Latch.make(false);
      yield* log.listen(() => signal.openUnsafe());
      yield* lock.withPermit(catchUp(log)).pipe(Effect.orDie);
      yield* Effect.forkScoped(
        Effect.forever(
          signal.await.pipe(
            Effect.andThen(signal.close),
            Effect.andThen(lock.withPermit(catchUp(log))),
            Effect.catchCause((cause) => Effect.logError('Failed to apply the quad log', cause)),
          ),
        ),
      );
    }

    const store: QuadStore = {
      query: (sparql, options) =>
        Effect.suspend(() => {
          const parsed = parseSparql(sparql);
          if (parsed.type === 'update') {
            return Effect.fail(new QuadStoreError({ message: 'Writes go through write(), not query()' }));
          }
          return lock.withPermit(run((options?.local ? local : main).query(sparql), 'Query failed'));
        }),

      write: (writes, options) =>
        lock.withPermit(
          Effect.gen(function* () {
            const batch: Batch = { id: crypto.randomUUID(), writes };
            if (options?.local) {
              yield* transaction(run(applyWrites(local, writes), 'Failed to write locally'));
            } else if (log) {
              yield* log
                .append(batch)
                .pipe(
                  Effect.mapError((cause) => new QuadStoreError({ message: 'Failed to append to the log', cause })),
                );
              yield* catchUp(log);
            } else {
              yield* transaction(run(applyBatch(batch, undefined), 'Failed to apply writes'));
              notify(batch);
            }
            return batch.id;
          }),
        ),

      quads: () => lock.withPermit(run(exportQuads(main), 'Failed to read the store')),

      listen: (onApplied) =>
        Effect.acquireRelease(
          Effect.sync(() => listeners.add(onApplied)),
          () => Effect.sync(() => listeners.delete(onApplied)),
        ),
    };
    return store;
  });

/** Every quad, read straight from the term and quad tables rather than through SPARQL. */
function* exportQuads(engine: EngineCore): Program<Quad[]> {
  const { terms, quads } = engine.store.tables;
  const byId = new Map<number, Term>();
  for (const [id, kind, lex, dt, lang] of yield* raw(`SELECT id, kind, lex, dt, lang FROM ${terms}`)) {
    byId.set(Number(id), engine.store.decode(kind, lex, dt, lang));
  }
  const term = (id: unknown): Term => {
    const found = byId.get(Number(id));
    if (!found) {
      throw new QuadStoreError({ message: `A quad names a missing term: ${String(id)}` });
    }
    return found;
  };
  return (yield* raw(`SELECT s, p, o, g FROM ${quads}`)).map(([s, p, o, g]) => ({
    s: term(s),
    p: term(p),
    o: term(o),
    g: g === 0 ? undefined : term(g),
  }));
}

/** A log held in process memory, for tests and hosts that need no durability. */
export const memoryLog = (): QuadLog => {
  const batches: Batch[] = [];
  const listeners = new Set<() => void>();
  return {
    append: (batch) =>
      Effect.sync(() => {
        batches.push(batch);
        listeners.forEach((listener) => listener());
      }),
    read: (cursor) =>
      Effect.sync(() => ({
        batches: batches.slice(cursor === undefined ? 0 : Number(cursor)),
        next: batches.length === 0 ? undefined : String(batches.length),
      })),
    listen: (onChange) =>
      Effect.acquireRelease(
        Effect.sync(() => listeners.add(onChange)),
        () => Effect.sync(() => listeners.delete(onChange)),
      ),
  };
};
