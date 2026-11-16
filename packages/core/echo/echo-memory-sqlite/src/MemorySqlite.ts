//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';

import * as Evaluator from '@dxos/brain/Evaluator';
import { Fact, MemoryError, MemoryQuery, MemoryService, Subscription } from '@dxos/echo-memory';
import { type FactStoreApi, FactStoreLive } from '@dxos/pipeline-rdf';
import { type Program, type SqlStorage, type SqlStorageValue, exec, rows, runSync } from '@dxos/sparql-sqlite';
import { runEffect } from '@dxos/sparql-sqlite/async';
import * as SqliteStorage from '@dxos/sql-sqlite/SqlStorage';

import * as FactLog from './FactLog.ts';

export type Options = {
  /** Makes each write atomic; a Durable Object passes `(fn) => ctx.storage.transactionSync(fn)`. */
  readonly transactionSync?: <T>(fn: () => T) => T;
  /**
   * The log knowledge-base writes go to first. With one, the store applies what it reads back from the log, remembers
   * how far it has read, follows entries other replicas add, and an empty store rebuilds itself from the log.
   */
  readonly log?: FactLog.FactLog;
  /**
   * Prefix of every table the memory owns, its fact store's included, so one database can hold a memory per space
   * beside the host's own tables (default none).
   */
  readonly prefix?: string;
};

/** Storage that runs its own transactions, as every `@dxos/sql-sqlite/SqlStorage` database does. */
type TransactionalStorage = SqlStorage & Required<Pick<Options, 'transactionSync'>>;

/**
 * Most acknowledged events one subscription remembers: an acknowledged event's row is what stops the same wake from
 * queueing again, but an ongoing watch queues without end, so past this the oldest are forgotten.
 */
export const MAX_EVENTS = 10_000;

type Tables = { readonly SUBSCRIPTIONS: string; readonly EVENTS: string; readonly STATE: string };

const tablesFor = (prefix = ''): Tables => ({
  SUBSCRIPTIONS: `${prefix}memory_subscriptions`,
  EVENTS: `${prefix}memory_events`,
  STATE: `${prefix}memory_state`,
});

/** When the rules were last evaluated, so a reopened memory replays as of then and catches up from there. */
const EVALUATED_AT = 'evaluated_at';

/** How far the store has applied the fact log. */
const LOG_CURSOR = 'log_cursor';

const schemaFor = (Table: Tables): string[] => [
  `CREATE TABLE IF NOT EXISTS ${Table.SUBSCRIPTIONS} (
    id TEXT PRIMARY KEY,
    seq INTEGER NOT NULL,
    owner TEXT,
    json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ${Table.EVENTS} (
    subscription TEXT NOT NULL,
    id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    json TEXT NOT NULL,
    acked INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (subscription, id)
  )`,
  `CREATE TABLE IF NOT EXISTS ${Table.STATE} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

const asString = (value: SqlStorageValue | undefined): string => {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a text column.');
  }
  return value;
};

const asNumber = (value: SqlStorageValue | undefined): number => {
  if (typeof value !== 'number') {
    throw new TypeError('Expected a numeric column.');
  }
  return value;
};

const encodeSubscription = Schema.encodeSync(Subscription.Subscription);
const decodeSubscription = Schema.decodeUnknownSync(Subscription.Subscription);
const encodeEvent = Schema.encodeSync(Subscription.MemoryEvent);
const decodeEvent = Schema.decodeUnknownSync(Subscription.MemoryEvent);

const toRules = (subscription: Subscription.Subscription): Evaluator.Subscription => ({
  id: subscription.id,
  rules: subscription.rules,
  createdAt: subscription.createdAt,
});

/**
 * Where a memory's state lives: the fact store, and a way to run the SQL of its own tables (subscriptions, outboxes,
 * state) against the same database, synchronously or through an async connection.
 */
type Backend = {
  readonly store: FactStoreApi;
  readonly run: <A>(program: Program<A>) => Effect.Effect<A, unknown>;
};

/**
 * Opens a MemoryService over synchronous SQLite: a Durable Object's `ctx.storage.sql` (which must pass
 * `transactionSync`), or a database from `@dxos/sql-sqlite/SqlStorage`. Facts live in pipeline-rdf's quad store;
 * subscriptions and outboxes in tables beside it. Time-driven rules are evaluated by a fiber in the scope, and a
 * memory reopened after rules came due evaluates them on open.
 */
export const make = (
  storage: SqlStorage | TransactionalStorage,
  options: Options = {},
): Effect.Effect<MemoryService.Service, never, Scope.Scope> =>
  Effect.gen(function* () {
    const store = yield* FactStoreLive.make(storage, options);
    return yield* makeWith({ store, run: (program) => Effect.try(() => runSync(storage, program)) }, options);
  });

/**
 * Opens a MemoryService over the async `SqlClient` in context, for a host whose database is only reachable that way
 * (the client-services backend): the same memory as {@link make}, over `@dxos/sparql-sqlite`'s async engine.
 */
export const makeAsync = (
  options: Pick<Options, 'log' | 'prefix'> = {},
): Effect.Effect<MemoryService.Service, never, Scope.Scope | SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const store = yield* FactStoreLive.makeAsync({ prefix: options.prefix }).pipe(Effect.orDie);
    return yield* makeWith(
      {
        store,
        run: (program) => runEffect(program, (error) => error).pipe(Effect.provideService(SqlClient.SqlClient, sql)),
      },
      options,
    );
  });

const makeWith = (
  { store, run }: Backend,
  options: Pick<Options, 'log' | 'prefix'>,
): Effect.Effect<MemoryService.Service, never, Scope.Scope> =>
  Effect.gen(function* () {
    const Table = tablesFor(options.prefix);
    yield* run(createSchema(Table)).pipe(Effect.orDie);

    const lock = yield* Semaphore.make(1);
    const wakeups = yield* Queue.sliding<void>(1);
    const evaluator = yield* hydrate(Table, run, store);

    const saveState = (key: string, value: string) => run(writeState(Table, key, value));
    const saveEvaluatedAt = (at: number) => saveState(EVALUATED_AT, String(at));
    const enqueue = (events: readonly Evaluator.Event[]) => run(enqueueEvents(Table, events));

    /** Evaluates the time-driven rules as of now, queues what woke, and records the time. */
    const tick = Effect.gen(function* () {
      const at = yield* Clock.currentTimeMillis;
      const queued = yield* enqueue(evaluator.current.tick(at));
      yield* saveEvaluatedAt(at);
      return queued;
    });

    const wake = Queue.offer(wakeups, undefined);

    const writing = <A, E>(effect: Effect.Effect<A, E>) => lock.withPermit(effect);

    const attempt = <A>(message: string, thunk: () => A) =>
      Effect.try({ try: thunk, catch: MemoryError.MemoryError.wrap({ message }) });

    // Catch up on rules that came due while the memory was closed, then follow the clock.
    yield* writing(tick).pipe(Effect.orDie);
    yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          const due = evaluator.current.nextDueAt();
          if (due === undefined) {
            yield* Queue.take(wakeups);
            return;
          }
          const now = yield* Clock.currentTimeMillis;
          const woken = yield* Effect.raceFirst(
            Effect.as(Queue.take(wakeups), true),
            Effect.as(Effect.sleep(Duration.millis(Math.max(0, due - now))), false),
          );
          if (!woken) {
            yield* writing(tick);
          }
        }).pipe(
          // A failed tick must not end the fiber, which would silently stop every time-driven rule.
          Effect.catchCause((cause) => Effect.logError('Failed to evaluate time-driven rules', cause)),
        ),
      ),
    );

    const queryRaw = (query: MemoryQuery.Any): Effect.Effect<unknown, unknown> => {
      switch (query._tag) {
        case 'facts':
          return store.query(query.pattern);
        case 'graphs':
          return store.select(query.sparql);
        case 'sparql':
          return store.rows(query.sparql);
        case 'predicates':
          return store.predicates();
        case 'cursor':
          return store.cursor(query.source);
      }
    };

    /** Stores facts, moves the read cursor, and queues what the facts wake; returns how many events were queued. */
    const applyPut = (entry: Extract<FactLog.Entry, { _tag: 'put' }>) =>
      Effect.gen(function* () {
        yield* store.putFacts(entry.facts);
        // Moved only once the facts are stored, so a failed put is read again rather than skipped.
        if (entry.read) {
          yield* store.setCursor(entry.read.source, entry.read.through);
        }
        if (entry.facts.length === 0) {
          return 0;
        }
        const at = yield* Clock.currentTimeMillis;
        const queued = yield* enqueue(evaluator.current.push(entry.facts, { at, quiet: entry.quiet }));
        yield* saveEvaluatedAt(at);
        return queued;
      });

    /** Forgets facts, cursors and queued events; the subscriptions stay, with their rule state started over. */
    const applyReset = Effect.gen(function* () {
      yield* store.clear();
      yield* run(exec(`DELETE FROM ${Table.EVENTS}`));
      const at = yield* Clock.currentTimeMillis;
      // A fresh evaluator holds no facts; the subscriptions are added back so they keep waking.
      const fresh = Evaluator.make();
      fresh.hydrate((yield* run(readSubscriptions(Table))).map(toRules), [], at);
      evaluator.current = fresh;
      yield* saveEvaluatedAt(at);
      return 0;
    });

    const apply = (entry: FactLog.Entry) => (entry._tag === 'put' ? applyPut(entry) : applyReset);

    /** Applies the log entries the store has not read yet, then records how far it read; returns events queued. */
    const catchUp = (log: FactLog.FactLog) =>
      Effect.gen(function* () {
        const page = yield* log.read(yield* run(readState(Table, LOG_CURSOR)));
        let queued = 0;
        for (const entry of page.entries) {
          queued += yield* apply(entry);
        }
        if (page.next !== undefined) {
          yield* saveState(LOG_CURSOR, page.next);
        }
        return queued;
      });

    /** Writes go to the log first, then the store applies them from it; without a log they apply directly. */
    const write = (entry: FactLog.Entry) =>
      writing(
        Effect.gen(function* () {
          const queued = options.log
            ? yield* options.log.append(entry).pipe(Effect.andThen(catchUp(options.log)))
            : yield* apply(entry);
          yield* wake;
          return queued;
        }),
      );

    const { log } = options;
    if (log) {
      // Listening before the first read means no entry lands between them unseen.
      const changes = yield* Queue.sliding<void>(1);
      yield* log.listen(() => void Queue.offerUnsafe(changes, undefined));
      // Rebuilds an empty store, and applies what other replicas wrote while it was closed.
      yield* writing(catchUp(log)).pipe(Effect.orDie);
      yield* Effect.forkScoped(
        Effect.forever(
          Queue.take(changes).pipe(
            Effect.andThen(writing(catchUp(log))),
            Effect.andThen(wake),
            Effect.catchCause((cause) => Effect.logError('Failed to apply the fact log', cause)),
          ),
        ),
      );
    }

    const service: MemoryService.Service = {
      put: (facts, putOptions) =>
        write({ _tag: 'put', facts, read: putOptions?.read, quiet: putOptions?.quiet }).pipe(
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to put facts' })),
        ),

      query: (query) =>
        queryRaw(query).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(MemoryQuery.resultOf(query))),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: `Failed to answer a ${query._tag} query` })),
        ),

      reset: () =>
        write({ _tag: 'reset' }).pipe(
          Effect.asVoid,
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to reset memory' })),
        ),

      subscribe: (subscription) =>
        writing(
          Effect.gen(function* () {
            const [{ others }] = yield* run(
              rows(`SELECT COUNT(*) AS others FROM ${Table.SUBSCRIPTIONS} WHERE id != ?`, subscription.id),
            );
            if (asNumber(others) >= Subscription.MAX_SUBSCRIPTIONS) {
              return false;
            }
            const rules = toRules(subscription);
            const current = evaluator.current.subscriptions.find(({ id }) => id === subscription.id);
            // Re-subscribing unchanged keeps the evaluator's state, so an achieved goal stays achieved.
            if (current?.rules !== rules.rules || current?.createdAt !== rules.createdAt) {
              yield* attempt('The subscription rules do not compile', () => evaluator.current.add(rules));
            }
            yield* run(
              exec(
                `INSERT INTO ${Table.SUBSCRIPTIONS} (id, seq, owner, json)
                 VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM ${Table.SUBSCRIPTIONS}), ?, ?)
                 ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, json = excluded.json`,
                subscription.id,
                subscription.owner ?? null,
                JSON.stringify(encodeSubscription(subscription)),
              ),
            );
            yield* wake;
            return true;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to subscribe' }))),

      subscriptions: (owner) =>
        run(readSubscriptions(Table)).pipe(
          Effect.map((found) => found.filter((subscription) => owner === undefined || subscription.owner === owner)),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to list subscriptions' })),
        ),

      unsubscribe: (id) =>
        writing(
          Effect.gen(function* () {
            yield* run(exec(`DELETE FROM ${Table.EVENTS} WHERE subscription = ?`, id));
            const removed = yield* run(rows(`DELETE FROM ${Table.SUBSCRIPTIONS} WHERE id = ? RETURNING id`, id));
            evaluator.current.remove(id);
            return removed.length > 0;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to unsubscribe' }))),

      take: (id) =>
        run(rows(`SELECT json FROM ${Table.EVENTS} WHERE subscription = ? AND acked = 0 ORDER BY seq`, id)).pipe(
          Effect.flatMap((found) =>
            attempt('Failed to decode the outbox', () =>
              found.map(({ json }) => decodeEvent(JSON.parse(asString(json)))),
            ),
          ),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to read the outbox' })),
        ),

      ack: (id, events) =>
        writing(
          Effect.forEach(events, (event) =>
            run(exec(`UPDATE ${Table.EVENTS} SET acked = 1 WHERE subscription = ? AND id = ?`, id, event)),
          ),
        ).pipe(
          Effect.asVoid,
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to acknowledge events' })),
        ),
    };

    return service;
  });

function* createSchema(Table: Tables): Program<void> {
  for (const statement of schemaFor(Table)) {
    yield* exec(statement);
  }
}

function* writeState(Table: Tables, key: string, value: string): Program<void> {
  yield* exec(
    `INSERT INTO ${Table.STATE} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

function* readState(Table: Tables, key: string): Program<string | undefined> {
  const [row] = yield* rows(`SELECT value FROM ${Table.STATE} WHERE key = ?`, key);
  return row === undefined ? undefined : asString(row.value);
}

/** The subscriptions, oldest first. */
function* readSubscriptions(Table: Tables): Program<Subscription.Subscription[]> {
  return (yield* rows(`SELECT json FROM ${Table.SUBSCRIPTIONS} ORDER BY seq`)).map(({ json }) =>
    decodeSubscription(JSON.parse(asString(json))),
  );
}

/** Queues the events not queued before (acknowledged or not); returns how many were new. */
function* enqueueEvents(Table: Tables, events: readonly Evaluator.Event[]): Program<number> {
  let queued = 0;
  const touched = new Set<string>();
  for (const event of events) {
    const json = JSON.stringify(
      encodeEvent({
        id: Subscription.MemoryEventId.make(event.id),
        subscription: Subscription.SubscriptionId.make(event.subscription),
        label: event.label,
        facts: Fact.decode(event.facts),
        at: new Date(event.at).toISOString(),
      }),
    );
    const inserted = yield* rows(
      `INSERT INTO ${Table.EVENTS} (subscription, id, seq, json)
       SELECT ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM ${Table.EVENTS}), ?
       WHERE EXISTS (SELECT 1 FROM ${Table.SUBSCRIPTIONS} WHERE id = ?)
       ON CONFLICT(subscription, id) DO NOTHING
       RETURNING id`,
      event.subscription,
      event.id,
      json,
      event.subscription,
    );
    queued += inserted.length;
    touched.add(event.subscription);
  }
  for (const subscription of touched) {
    yield* exec(
      `DELETE FROM ${Table.EVENTS} WHERE subscription = ? AND acked = 1 AND seq <= (
         SELECT seq FROM ${Table.EVENTS} WHERE subscription = ? ORDER BY seq DESC LIMIT 1 OFFSET ?
       )`,
      subscription,
      subscription,
      MAX_EVENTS,
    );
  }
  return queued;
}

/**
 * Rebuilds the rule evaluator from storage: the subscriptions and the stored facts, replayed as of the last
 * evaluation and emitting nothing. A subscription whose rules no longer compile is left out rather than failing open.
 */
const hydrate = (
  Table: Tables,
  run: Backend['run'],
  store: FactStoreApi,
): Effect.Effect<{ current: Evaluator.Evaluator }> =>
  Effect.gen(function* () {
    const facts = yield* store.query({});
    const evaluatedAt = yield* run(readState(Table, EVALUATED_AT));
    const at = evaluatedAt === undefined ? yield* Clock.currentTimeMillis : Number(evaluatedAt);
    const subscriptions = (yield* run(readSubscriptions(Table))).map(toRules).filter((rules) => {
      try {
        Evaluator.make().add(rules);
        return true;
      } catch {
        return false;
      }
    });
    const evaluator = Evaluator.make();
    evaluator.hydrate(
      subscriptions,
      [...facts].sort((left, right) =>
        left.attribution.generatedAtTime.localeCompare(right.attribution.generatedAtTime),
      ),
      at,
    );
    return { current: evaluator };
  }).pipe(Effect.orDie);

/** Layer of {@link makeAsync}. */
export const layerAsync = (
  options?: Pick<Options, 'log' | 'prefix'>,
): Layer.Layer<MemoryService.MemoryService, never, SqlClient.SqlClient> =>
  Layer.effect(MemoryService.MemoryService, makeAsync(options));

/** Layer of {@link make}. */
export const layer = (
  storage: SqlStorage | TransactionalStorage,
  options?: Options,
): Layer.Layer<MemoryService.MemoryService> => Layer.effect(MemoryService.MemoryService, make(storage, options));

/** A memory over a private in-memory SQLite database, closed with the layer's scope. */
export const layerMemory: Layer.Layer<MemoryService.MemoryService> = Layer.effect(
  MemoryService.MemoryService,
  Effect.acquireRelease(SqliteStorage.makeMemory(), (database) => Effect.sync(() => database.close())).pipe(
    Effect.orDie,
    Effect.flatMap((database) => make(database)),
  ),
);

/**
 * A memory over a SQLite file (created when absent), closed with the layer's scope; reopening the same path sees the
 * facts, subscriptions and outboxes written before. Node and bun only.
 */
export const layerFile = (path: string): Layer.Layer<MemoryService.MemoryService> =>
  Layer.effect(
    MemoryService.MemoryService,
    Effect.acquireRelease(SqliteStorage.makeFile(path), (database) => Effect.sync(() => database.close())).pipe(
      Effect.orDie,
      Effect.flatMap((database) => make(database)),
    ),
  );
