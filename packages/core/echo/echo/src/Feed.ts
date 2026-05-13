//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { DXN, type ObjectId } from '@dxos/keys';

import * as Annotation from './Annotation';
import type * as Entity from './Entity';
import type * as Filter from './Filter';
import * as internal from './internal';
import * as Obj from './Obj';
import type * as Query from './Query';
import type * as QueryResult from './QueryResult';
import * as Type from './Type';

/**
 * Runtime schema for a Feed object.
 *
 * @example
 * ```ts
 * const feed = Obj.make(Feed.Feed, { name: 'notifications', kind: 'org.dxos.plugin.notifications.v1' });
 * ```
 */
export const Feed = Schema.Struct({
  /** User-facing display name. */
  name: Schema.String.pipe(Schema.optional),
  /** Identifier for the feed's kind (e.g., plugin id). */
  kind: Schema.String.pipe(internal.FormInputAnnotation.set(false), Schema.optional),

  /**
   * Feed namespace.
   * Controls how feed data is stored and replicated.
   * - `data`: Data feed (default).
   * - `trace`: Trace feed.
   */
  namespace: Schema.optional(Schema.Literal('data', 'trace')),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.feed',
    version: '0.1.0',
  }),
  internal.SystemTypeAnnotation.set(true),
  Annotation.IconAnnotation.set({
    icon: 'ph--rows--regular',
    hue: 'yellow',
  }),
);

/**
 * TypeScript instance type for a Feed object.
 */
export interface Feed extends Schema.Schema.Type<typeof Feed> {}

//
// Types
//

/**
 * Opaque cursor for iterating over feed items.
 */
// TODO(dmaretskyi): T needs to be referenced in the type structure for typescript to respect it during inference and type-checking.
export interface Cursor<T = Obj.Snapshot> {
  readonly _tag: 'Cursor';
}

/**
 * Retention options for a feed.
 */
export interface RetentionOptions {
  /** Retain items after this cursor position. */
  // TODO(wittjosiah): Use FeedCursor from @dxos/feed?
  cursor?: string;
}

/**
 * Sync options for a feed.
 */
export interface SyncOptions {
  /** Push local changes to the server. Defaults to true. */
  shouldPush?: boolean;
  /** Pull remote changes from the server. Defaults to true. */
  shouldPull?: boolean;
}

//
// Factory
//

/**
 * Creates a new feed object.
 *
 * @example
 * ```ts
 * const feed = Feed.make({ name: 'notifications', kind: 'org.dxos.plugin.notifications.v1' });
 * ```
 */
// TODO(wittjosiah): How to control the feed namespace (data/trace)? Why do feeds have namespaces?
export const make = (props: Obj.MakeProps<typeof Feed> = {}): Feed => Obj.make(Feed, props);

/**
 * Derives the queue DXN from the feed object's DXN.
 * Returns `undefined` when the feed is not stored in a space yet.
 *
 * Used internally by the feed service layer.
 */
export const getQueueDxn = (feed: Feed): DXN | undefined => {
  const self = Obj.getDXN(feed).asEchoDXN();
  if (!self || !self.spaceId) {
    return undefined;
  }
  return new DXN(DXN.kind.QUEUE, [feed.namespace ?? 'data', self.spaceId, self.echoId]);
};

/**
 * Creates a Feed object from a queue DXN, inferring the feed's id and namespace from the DXN parts.
 *
 * The resulting Feed, when added to the same space as the queue, will have a queue DXN
 * equal to the input (see `Feed.getQueueDxn`). Useful when migrating `Ref(Queue)` fields to
 * `Ref(Feed.Feed)`.
 *
 * @remarks Unsafe because the caller must ensure the queue DXN's space matches the database
 * the feed is added to; the feed id is set from the queue id, bypassing id generation.
 */
export const unsafeFromQueueDXN = (queueDxn: DXN): Feed => {
  const parts = queueDxn.asQueueDXN();
  if (!parts) {
    throw new Error(`Expected a queue DXN, got: ${queueDxn.toString()}`);
  }
  return Obj.make(Feed, {
    id: parts.queueId as ObjectId,
    namespace: parts.subspaceTag === 'trace' ? 'trace' : undefined,
  });
};

//
// Service
//

/**
 * Effect service for feed operations.
 * Provides the bridge to the underlying storage implementation.
 * Must be provided by the application layer (e.g., echo-db).
 */
export class FeedService extends Context.Tag('@dxos/echo/Feed/FeedService')<
  FeedService,
  {
    /**
     * Appends items to a feed.
     */
    append(feed: Feed, items: Entity.Unknown[]): Promise<void>;

    /**
     * Removes items from a feed by ID.
     */
    // TODO(dmaretskyi): Change type to ObjectId.
    remove(feed: Feed, ids: string[]): Promise<void>;

    /**
     * Queries items in a feed.
     */
    query: {
      <Q extends Query.Any>(feed: Feed, query: Q): QueryResult.QueryResult<Query.Type<Q>>;
      <F extends Filter.Any>(feed: Feed, filter: F): QueryResult.QueryResult<Filter.Type<F>>;
    };

    /**
     * Syncs the feed with the server.
     */
    sync(feed: Feed, options?: SyncOptions): Promise<void>;

    /**
     * Appends items to a feed addressed by its underlying queue DXN, without requiring
     * a persisted `Feed.Feed` object. Used by ad-hoc / per-invocation feeds (e.g. trace
     * event queues) where materializing a `Feed.Feed` per write would be wasteful.
     */
    appendByDxn(queueDxn: DXN, items: Entity.Unknown[]): Promise<void>;

    /**
     * Queries items in a feed addressed by its underlying queue DXN.
     * DXN-driven counterpart to `query()` — for debug UIs and other consumers
     * that hold a raw queue DXN and don't have a materialized `Feed.Feed`.
     */
    queryByDxn: {
      <Q extends Query.Any>(queueDxn: DXN, query: Q): QueryResult.QueryResult<Query.Type<Q>>;
      <F extends Filter.Any>(queueDxn: DXN, filter: F): QueryResult.QueryResult<Filter.Type<F>>;
    };
  }
>() {}

/**
 * @deprecated Use `FeedService` instead.
 */
export type Service = FeedService;

/**
 * @deprecated Use `FeedService` instead.
 */
export const Service = FeedService;

/**
 * Layer that provides a Feed service that throws when accessed.
 * Useful as a default layer when no feed service is available.
 */
export const notAvailable: Layer.Layer<FeedService> = Layer.succeed(FeedService, {
  append: () => {
    throw new Error('Feed.FeedService not available');
  },
  remove: () => {
    throw new Error('Feed.FeedService not available');
  },
  query: () => {
    throw new Error('Feed.FeedService not available');
  },
  sync: () => {
    throw new Error('Feed.FeedService not available');
  },
  appendByDxn: () => {
    throw new Error('Feed.FeedService not available');
  },
  queryByDxn: () => {
    throw new Error('Feed.FeedService not available');
  },
} as Context.Tag.Service<FeedService>);

//
// Context (per-call) service
//

/**
 * Effect service exposing a single `Feed.Feed` as the "current" feed for a call site —
 * e.g. an agent context feed scoped to the running operation. Use this when an Effect
 * program needs to know which feed it should operate on without threading it through
 * every function signature.
 *
 * Replaces the legacy `ContextQueueService` from `@dxos/echo-db`.
 */
export class ContextFeedService extends Context.Tag('@dxos/echo/Feed/ContextFeedService')<
  ContextFeedService,
  {
    readonly feed: Feed;
  }
>() {
  static layer = (feed: Feed): Layer.Layer<ContextFeedService> => Layer.succeed(ContextFeedService, { feed });
}

//
// Operations
//

/**
 * Appends items to a feed.
 *
 * @example
 * ```ts
 * yield* Feed.append(feed, [Obj.make(Notification, { title: 'Hello' })]);
 * ```
 */
export const append = (feed: Feed, items: Entity.Unknown[]): Effect.Effect<void, never, FeedService> =>
  Effect.gen(function* () {
    const service = yield* FeedService;
    yield* Effect.promise(() => service.append(feed, items));
  });

/**
 * Removes items from a feed.
 *
 * @example
 * ```ts
 * yield* Feed.remove(feed, [item]);
 * ```
 */
// TODO(dmaretskyi): Should we allow snapshots here? - what does it mean to remove a snapshot?
export const remove = (feed: Feed, items: (Entity.Unknown | Obj.Snapshot)[]): Effect.Effect<void, never, FeedService> =>
  Effect.gen(function* () {
    const service = yield* FeedService;
    const ids = items.map((item) => item.id);
    yield* Effect.promise(() => service.remove(feed, ids));
  });

/**
 * Creates a reactive query over items in a feed.
 *
 * @example
 * ```ts
 * const result = yield* Feed.query(feed, Filter.type(Person));
 * ```
 */
// TODO(dmaretskyi): Suport chained queries:
//                   const result = yield* feed.pipe(Feed.query(Filter.type(Person))); result.subscribe(...)
//                   const objects = yield* feed.pipe(Feed.query(Filter.type(Person))).run;
//                   const object = yield* feed.pipe(Feed.query(Filter.type(Person))).first;
// ... unify for Database and schema queries.
export const query: {
  <Q extends Query.Any>(
    feed: Feed,
    query: Q,
  ): Effect.Effect<QueryResult.QueryResult<Query.Type<Q>>, never, FeedService>;
  <F extends Filter.Any>(
    feed: Feed,
    filter: F,
  ): Effect.Effect<QueryResult.QueryResult<Filter.Type<F>>, never, FeedService>;
} = (feed: Feed, queryOrFilter: Query.Any | Filter.Any) =>
  FeedService.pipe(Effect.map((service) => service.query(feed, queryOrFilter as any) as QueryResult.QueryResult<any>));

/**
 * Executes a feed query once and returns the results.
 *
 * @example
 * ```ts
 * const items = yield* Feed.runQuery(feed, Filter.type(Person));
 * ```
 */
export const runQuery: {
  <Q extends Query.Any>(feed: Feed, query: Q): Effect.Effect<Query.Type<Q>[], never, FeedService>;
  <F extends Filter.Any>(feed: Feed, filter: F): Effect.Effect<Filter.Type<F>[], never, FeedService>;
} = (feed: Feed, queryOrFilter: Query.Any | Filter.Any) =>
  query(feed, queryOrFilter as any).pipe(Effect.flatMap((queryResult) => Effect.promise(() => queryResult.run())));

/**
 * Syncs the feed with the server.
 *
 * @example
 * ```ts
 * yield* Feed.sync(feed);
 * yield* Feed.sync(feed, { shouldPush: false });
 * ```
 */
export const sync = (feed: Feed, options?: SyncOptions): Effect.Effect<void, never, FeedService> =>
  Effect.gen(function* () {
    const service = yield* FeedService;
    yield* Effect.promise(() => service.sync(feed, options));
  });

/**
 * Appends items to a feed addressed by its underlying queue DXN.
 * Use when a `Feed.Feed` object hasn't been (or won't be) materialized — e.g. ad-hoc
 * per-invocation trace queues.
 *
 * @example
 * ```ts
 * yield* Feed.appendByDxn(queueDxn, [Obj.make(TraceEvent, { ... })]);
 * ```
 */
export const appendByDxn = (queueDxn: DXN, items: Entity.Unknown[]): Effect.Effect<void, never, FeedService> =>
  Effect.gen(function* () {
    const service = yield* FeedService;
    yield* Effect.promise(() => service.appendByDxn(queueDxn, items));
  });

/**
 * Creates a reactive query over items in a feed addressed by its underlying queue DXN.
 * DXN-driven counterpart to `query()` — for debug UIs and other consumers that hold a
 * raw queue DXN.
 *
 * @example
 * ```ts
 * const result = yield* Feed.queryByDxn(queueDxn, Filter.everything());
 * ```
 */
export const queryByDxn: {
  <Q extends Query.Any>(
    queueDxn: DXN,
    query: Q,
  ): Effect.Effect<QueryResult.QueryResult<Query.Type<Q>>, never, FeedService>;
  <F extends Filter.Any>(
    queueDxn: DXN,
    filter: F,
  ): Effect.Effect<QueryResult.QueryResult<Filter.Type<F>>, never, FeedService>;
} = (queueDxn: DXN, queryOrFilter: Query.Any | Filter.Any) =>
  FeedService.pipe(
    Effect.map((service) => service.queryByDxn(queueDxn, queryOrFilter as any) as QueryResult.QueryResult<any>),
  );

/**
 * Executes a feed query addressed by queue DXN once and returns the results.
 *
 * @example
 * ```ts
 * const items = yield* Feed.runQueryByDxn(queueDxn, Filter.type(Person));
 * ```
 */
export const runQueryByDxn: {
  <Q extends Query.Any>(queueDxn: DXN, query: Q): Effect.Effect<Query.Type<Q>[], never, FeedService>;
  <F extends Filter.Any>(queueDxn: DXN, filter: F): Effect.Effect<Filter.Type<F>[], never, FeedService>;
} = (queueDxn: DXN, queryOrFilter: Query.Any | Filter.Any) =>
  queryByDxn(queueDxn, queryOrFilter as any).pipe(
    Effect.flatMap((queryResult) => Effect.promise(() => queryResult.run())),
  );

/**
 * Creates a cursor for iterating over feed items.
 * Currently stubbed — cursor operations are not yet implemented.
 *
 * @example
 * ```ts
 * const cursor = yield* Feed.cursor<Person>(feed);
 * const item = yield* Feed.next(cursor);
 * ```
 */
// TODO(wittjosiah): Implement cursor operations. Use Effect streams?
export const cursor = <T = Obj.Snapshot>(_feed: Feed): Effect.Effect<Cursor<T>, never, FeedService> =>
  Effect.succeed({ _tag: 'Cursor' } as Cursor<T>);

/**
 * Returns the next item from a feed cursor.
 * Currently stubbed — cursor operations are not yet implemented.
 */
export const next = <T = Obj.Snapshot>(_cursor: Cursor<T>): Effect.Effect<T, never, FeedService> =>
  Effect.die('Feed.next is not yet implemented');

/**
 * Returns the next item from a feed cursor as an Option.
 * Currently stubbed — cursor operations are not yet implemented.
 */
export const nextOption = <T = Obj.Snapshot>(_cursor: Cursor<T>): Effect.Effect<Option.Option<T>, never, FeedService> =>
  Effect.die('Feed.nextOption is not yet implemented');

/**
 * Sets the local retention policy for a feed.
 * Currently stubbed — queues do not yet support retention.
 *
 * @example
 * ```ts
 * yield* Feed.setRetention(feed, { count: 1000 });
 * ```
 */
// TODO(feed): Implement when queue retention is supported.
export const setRetention = (_feed: Feed, _options: RetentionOptions): Effect.Effect<void, never, FeedService> =>
  Effect.void;
