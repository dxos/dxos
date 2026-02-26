//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Option from 'effect/Option';

import { DXN } from '@dxos/keys';

import type * as Entity from './Entity';
import type * as Filter from './Filter';
import * as Obj from './Obj';
import type * as Query from './Query';
import type * as QueryResult from './QueryResult';
import * as Type from './Type';

//
// Types
//

/**
 * Meta key source for storing the backing DXN bound to a feed object.
 */
export const DXN_KEY = 'dxos.org/key/feed';

/**
 * A Feed echo object instance.
 */
export type Feed = Obj.Obj<Type.Feed>;

/**
 * Opaque cursor for iterating over feed items.
 */
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

//
// Factory
//

/**
 * Creates a new feed object.
 *
 * @example
 * ```ts
 * const feed = Feed.make({ name: 'notifications', kind: 'dxos.org/plugin/notifications/v1' });
 * ```
 */
// TODO(wittjosiah): How to control the feed namespace (data/trace)? Why do feeds have namespaces?
export const make = (props: Obj.MakeProps<typeof Type.Feed>): Feed => Obj.make(Type.Feed, props);

/**
 * Reads the queue DXN from feed metadata.
 *
 * @deprecated
 */
// TODO(wittjosiah): Align backing feed dxn's with object DXN.
export const getQueueDxn = (feed: Feed): DXN | undefined => {
  const keys = Obj.getKeys(feed, DXN_KEY);
  return keys.length === 0 ? undefined : DXN.parse(keys[0].id);
};

//
// Service
//

/**
 * Effect service for feed operations.
 * Provides the bridge to the underlying storage implementation.
 * Must be provided by the application layer (e.g., echo-db).
 */
export class Service extends Context.Tag('@dxos/echo/Feed/Service')<
  Service,
  {
    /**
     * Appends items to a feed.
     */
    append(feed: Feed, items: Entity.Unknown[]): Promise<void>;

    /**
     * Removes items from a feed by ID.
     */
    remove(feed: Feed, ids: string[]): Promise<void>;

    /**
     * Queries items in a feed.
     */
    query: {
      <Q extends Query.Any>(feed: Feed, query: Q): QueryResult.QueryResult<Query.Type<Q>>;
      <F extends Filter.Any>(feed: Feed, filter: F): QueryResult.QueryResult<Filter.Type<F>>;
    };
  }
>() {}

/**
 * Layer that provides a Feed service that throws when accessed.
 * Useful as a default layer when no feed service is available.
 */
export const notAvailable: Layer.Layer<Service> = Layer.succeed(Service, {
  append: () => {
    throw new Error('Feed.Service not available');
  },
  remove: () => {
    throw new Error('Feed.Service not available');
  },
  query: () => {
    throw new Error('Feed.Service not available');
  },
} as Context.Tag.Service<Service>);

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
export const append = (feed: Feed, items: Entity.Unknown[]): Effect.Effect<void, never, Service> =>
  Effect.gen(function* () {
    const service = yield* Service;
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
export const remove = (feed: Feed, items: (Entity.Unknown | Obj.Snapshot)[]): Effect.Effect<void, never, Service> =>
  Effect.gen(function* () {
    const service = yield* Service;
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
export const query: {
  <Q extends Query.Any>(feed: Feed, query: Q): Effect.Effect<QueryResult.QueryResult<Query.Type<Q>>, never, Service>;
  <F extends Filter.Any>(feed: Feed, filter: F): Effect.Effect<QueryResult.QueryResult<Filter.Type<F>>, never, Service>;
} = (feed: Feed, queryOrFilter: Query.Any | Filter.Any) =>
  Service.pipe(Effect.map((service) => service.query(feed, queryOrFilter as any) as QueryResult.QueryResult<any>));

/**
 * Executes a feed query once and returns the results.
 *
 * @example
 * ```ts
 * const items = yield* Feed.runQuery(feed, Filter.type(Person));
 * ```
 */
export const runQuery: {
  <Q extends Query.Any>(feed: Feed, query: Q): Effect.Effect<Query.Type<Q>[], never, Service>;
  <F extends Filter.Any>(feed: Feed, filter: F): Effect.Effect<Filter.Type<F>[], never, Service>;
} = (feed: Feed, queryOrFilter: Query.Any | Filter.Any) =>
  query(feed, queryOrFilter as any).pipe(Effect.flatMap((queryResult) => Effect.promise(() => queryResult.run())));

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
export const cursor = <T = Obj.Snapshot>(_feed: Feed): Effect.Effect<Cursor<T>, never, Service> =>
  Effect.succeed({ _tag: 'Cursor' } as Cursor<T>);

/**
 * Returns the next item from a feed cursor.
 * Currently stubbed — cursor operations are not yet implemented.
 */
export const next = <T = Obj.Snapshot>(_cursor: Cursor<T>): Effect.Effect<T, never, Service> =>
  Effect.die('Feed.next is not yet implemented');

/**
 * Returns the next item from a feed cursor as an Option.
 * Currently stubbed — cursor operations are not yet implemented.
 */
export const nextOption = <T = Obj.Snapshot>(_cursor: Cursor<T>): Effect.Effect<Option.Option<T>, never, Service> =>
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
export const setRetention = (_feed: Feed, _options: RetentionOptions): Effect.Effect<void, never, Service> =>
  Effect.void;
