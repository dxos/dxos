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

import * as Evaluator from '@dxos/brain/Evaluator';
import { Fact, MemoryError, MemoryQuery, MemoryService, Subscription } from '@dxos/echo-memory';
import { type FactStoreApi, FactStoreLive } from '@dxos/pipeline-rdf';
import { type SqlStorage, type SqlStorageValue } from '@dxos/sparql-sqlite';
import * as SqliteStorage from '@dxos/sql-sqlite/SqlStorage';

export type Options = {
  /** Makes each write atomic; a Durable Object passes `(fn) => ctx.storage.transactionSync(fn)`. */
  readonly transactionSync?: <T>(fn: () => T) => T;
};

/** Storage that runs its own transactions, as every `@dxos/sql-sqlite/SqlStorage` database does. */
type TransactionalStorage = SqlStorage & Required<Options>;

/**
 * Most acknowledged events one subscription remembers: an acknowledged event's row is what stops the same wake from
 * queueing again, but an ongoing watch queues without end, so past this the oldest are forgotten.
 */
export const MAX_EVENTS = 10_000;

const Table = {
  SUBSCRIPTIONS: 'memory_subscriptions',
  EVENTS: 'memory_events',
  STATE: 'memory_state',
} as const;

/** When the rules were last evaluated, so a reopened memory replays as of then and catches up from there. */
const EVALUATED_AT = 'evaluated_at';

const SCHEMA = [
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
    for (const statement of SCHEMA) {
      storage.exec(statement);
    }

    const lock = yield* Semaphore.make(1);
    const wakeups = yield* Queue.sliding<void>(1);
    const evaluator = yield* hydrate(storage, store);

    const exec = (query: string, ...bindings: (string | number | null)[]) => storage.exec(query, ...bindings).toArray();

    const saveEvaluatedAt = (at: number) =>
      exec(
        `INSERT INTO ${Table.STATE} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        EVALUATED_AT,
        String(at),
      );

    /** Queues the events not queued before (acknowledged or not); returns how many were new. */
    const enqueue = (events: readonly Evaluator.Event[]): number => {
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
        queued += exec(
          `INSERT INTO ${Table.EVENTS} (subscription, id, seq, json)
           SELECT ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM ${Table.EVENTS}), ?
           WHERE EXISTS (SELECT 1 FROM ${Table.SUBSCRIPTIONS} WHERE id = ?)
           ON CONFLICT(subscription, id) DO NOTHING
           RETURNING id`,
          event.subscription,
          event.id,
          json,
          event.subscription,
        ).length;
        touched.add(event.subscription);
      }
      for (const subscription of touched) {
        exec(
          `DELETE FROM ${Table.EVENTS} WHERE subscription = ? AND acked = 1 AND seq <= (
             SELECT seq FROM ${Table.EVENTS} WHERE subscription = ? ORDER BY seq DESC LIMIT 1 OFFSET ?
           )`,
          subscription,
          subscription,
          MAX_EVENTS,
        );
      }
      return queued;
    };

    /** Evaluates the time-driven rules as of now, queues what woke, and records the time. */
    const tick = Effect.gen(function* () {
      const at = yield* Clock.currentTimeMillis;
      const queued = enqueue(evaluator.current.tick(at));
      saveEvaluatedAt(at);
      return queued;
    });

    const wake = Queue.offer(wakeups, undefined);

    const writing = <A, E>(effect: Effect.Effect<A, E>) => lock.withPermit(effect);

    const attempt = <A>(message: string, run: () => A) =>
      Effect.try({ try: run, catch: MemoryError.MemoryError.wrap({ message }) });

    // Catch up on rules that came due while the memory was closed, then follow the clock.
    yield* writing(tick);
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

    const service: MemoryService.Service = {
      put: (facts, putOptions) =>
        writing(
          Effect.gen(function* () {
            yield* store.putFacts(facts);
            // Moved only once the facts are stored, so a failed put is read again rather than skipped.
            if (putOptions?.read) {
              yield* store.setCursor(putOptions.read.source, putOptions.read.through);
            }
            if (facts.length === 0) {
              return 0;
            }
            const at = yield* Clock.currentTimeMillis;
            const queued = enqueue(evaluator.current.push(facts, { at, quiet: putOptions?.quiet }));
            saveEvaluatedAt(at);
            yield* wake;
            return queued;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to put facts' }))),

      query: (query) =>
        queryRaw(query).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(MemoryQuery.resultOf(query))),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: `Failed to answer a ${query._tag} query` })),
        ),

      reset: () =>
        writing(
          Effect.gen(function* () {
            yield* store.clear();
            exec(`DELETE FROM ${Table.EVENTS}`);
            const at = yield* Clock.currentTimeMillis;
            // A fresh evaluator holds no facts; the subscriptions are added back so they keep waking.
            const fresh = Evaluator.make();
            fresh.hydrate(readSubscriptions(storage).map(toRules), [], at);
            evaluator.current = fresh;
            saveEvaluatedAt(at);
            yield* wake;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to reset memory' }))),

      subscribe: (subscription) =>
        writing(
          Effect.gen(function* () {
            const [{ others }] = exec(
              `SELECT COUNT(*) AS others FROM ${Table.SUBSCRIPTIONS} WHERE id != ?`,
              subscription.id,
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
            exec(
              `INSERT INTO ${Table.SUBSCRIPTIONS} (id, seq, owner, json)
               VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM ${Table.SUBSCRIPTIONS}), ?, ?)
               ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, json = excluded.json`,
              subscription.id,
              subscription.owner ?? null,
              JSON.stringify(encodeSubscription(subscription)),
            );
            yield* wake;
            return true;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to subscribe' }))),

      subscriptions: (owner) =>
        attempt('Failed to list subscriptions', () =>
          readSubscriptions(storage).filter((subscription) => owner === undefined || subscription.owner === owner),
        ),

      unsubscribe: (id) =>
        writing(
          attempt('Failed to unsubscribe', () => {
            exec(`DELETE FROM ${Table.EVENTS} WHERE subscription = ?`, id);
            const removed = exec(`DELETE FROM ${Table.SUBSCRIPTIONS} WHERE id = ? RETURNING id`, id).length > 0;
            evaluator.current.remove(id);
            return removed;
          }),
        ),

      take: (id) =>
        attempt('Failed to read the outbox', () =>
          exec(`SELECT json FROM ${Table.EVENTS} WHERE subscription = ? AND acked = 0 ORDER BY seq`, id).map(
            ({ json }) => decodeEvent(JSON.parse(asString(json))),
          ),
        ),

      ack: (id, events) =>
        writing(
          attempt('Failed to acknowledge events', () => {
            for (const event of events) {
              exec(`UPDATE ${Table.EVENTS} SET acked = 1 WHERE subscription = ? AND id = ?`, id, event);
            }
          }),
        ),
    };

    return service;
  });

/** The subscriptions, oldest first. */
const readSubscriptions = (storage: SqlStorage): Subscription.Subscription[] =>
  storage
    .exec(`SELECT json FROM ${Table.SUBSCRIPTIONS} ORDER BY seq`)
    .toArray()
    .map(({ json }) => decodeSubscription(JSON.parse(asString(json))));

/**
 * Rebuilds the rule evaluator from storage: the subscriptions and the stored facts, replayed as of the last
 * evaluation and emitting nothing. A subscription whose rules no longer compile is left out rather than failing open.
 */
const hydrate = (storage: SqlStorage, store: FactStoreApi): Effect.Effect<{ current: Evaluator.Evaluator }> =>
  Effect.gen(function* () {
    const facts = yield* store.query({}).pipe(Effect.orDie);
    const [state] = storage.exec(`SELECT value FROM ${Table.STATE} WHERE key = ?`, EVALUATED_AT).toArray();
    const at = state === undefined ? yield* Clock.currentTimeMillis : Number(asString(state.value));
    const subscriptions = readSubscriptions(storage)
      .map(toRules)
      .filter((rules) => {
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
  });

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
