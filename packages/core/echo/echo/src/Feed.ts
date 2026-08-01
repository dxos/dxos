//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import type * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { DXN, EID } from '@dxos/keys';

import * as Annotation from './Annotation';
import * as Database from './Database';
import type * as Entity from './Entity';
import type * as Filter from './Filter';
import * as internal from './internal';
import * as Obj from './Obj';
import * as Query from './Query';
import type * as QueryResult from './QueryResult';
import * as Scope from './Scope';
import * as Type from './Type';

/**
 * Runtime schema for a Feed object.
 *
 * @example
 * ```ts
 * const feed = Obj.make(Feed.Feed, { name: 'notifications', kind: 'org.dxos.plugin.notifications.v1' });
 * ```
 */
export class Feed extends Type.makeObject<Feed>(DXN.make('org.dxos.type.feed', '0.1.0'))(
  Schema.Struct({
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
    internal.HiddenAnnotation.set(true),
    Annotation.IconAnnotation.set({ icon: 'ph--rows--regular', hue: 'yellow' }),
  ),
) {}

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

/**
 * Queue replication backlog for a feed namespace.
 * `0` / `0` means caught up on pull and push.
 */
export interface SyncState {
  /** Blocks still to pull from remote. */
  blocksToPull: number;
  /** Unpositioned blocks still to push to remote. */
  blocksToPush: number;
  /** Total blocks stored locally for the feed namespace. */
  totalBlocks: number;
}

/**
 * Effect service tag for injecting a Feed into effect operations.
 * Used to provide a specific feed to operations that operate on it without threading
 * the feed as an explicit parameter through every call site.
 */
export class ContextFeedService extends Context.Tag('@dxos/echo/Feed/ContextFeedService')<
  ContextFeedService,
  {
    readonly feed: Feed;
  }
>() {
  static layer = (feed: Feed) => Layer.succeed(ContextFeedService, { feed });
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
 * Returns the feed object's EID when the feed is stored in a space.
 *
 * Used internally by the feed service layer.
 */
export const getFeedUri = (feed: Feed): EID.EID | undefined => EID.tryParse(Obj.getURI(feed));

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
export const append = (feed: Feed, items: Entity.Unknown[]): Effect.Effect<void, never, Database.Service> =>
  Database.Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.appendToFeed(feed, items)))).pipe(
    Effect.withSpan('Feed.append'),
  );

/**
 * Removes items from a feed.
 *
 * @example
 * ```ts
 * yield* Feed.remove(feed, [item]);
 * ```
 */
// TODO(dmaretskyi): Should we allow snapshots here? - what does it mean to remove a snapshot?
export const remove = (
  feed: Feed,
  items: (Entity.Unknown | Obj.Snapshot)[],
): Effect.Effect<void, never, Database.Service> =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) =>
      Effect.promise(() =>
        db.removeFeedItemsByIds(
          feed,
          items.map((item) => item.id),
        ),
      ),
    ),
  ).pipe(Effect.withSpan('Feed.remove'));

/**
 * Creates a reactive query over items in a feed.
 *
 * Returns a {@link QueryResult.QueryResultEffect}: yielding it produces a subscribable
 * `QueryResult`, while its `.run` / `.first` shorthands execute the query once. This mirrors
 * `Database.query` so feed and database queries chain identically.
 *
 * Supports both data-first and data-last (curried) forms; the latter composes with `pipe`.
 *
 * In non-Effect code, query a feed directly through the database with a feed scope:
 * `db.query(Query.select(filter).from(Scope.feed(Feed.getFeedUri(feed))))`.
 *
 * @example
 * ```ts
 * const result = yield* Feed.query(feed, Filter.type(Person));
 * result.subscribe(...);
 *
 * const objects = yield* Feed.query(feed, Filter.type(Person)).run;
 * const object = yield* Feed.query(feed, Filter.type(Person)).first;
 *
 * // Data-last (curried) form composes with `pipe`:
 * const objects = yield* pipe(feed, Feed.query(Filter.type(Person))).run;
 * ```
 */
export const query: {
  <Q extends Query.Any>(feed: Feed, query: Q): QueryResult.QueryResultEffect<Query.Type<Q>, never, Database.Service>;
  <F extends Filter.Any>(feed: Feed, filter: F): QueryResult.QueryResultEffect<Filter.Type<F>, never, Database.Service>;
  <Q extends Query.Any>(
    query: Q,
  ): (feed: Feed) => QueryResult.QueryResultEffect<Query.Type<Q>, never, Database.Service>;
  <F extends Filter.Any>(
    filter: F,
  ): (feed: Feed) => QueryResult.QueryResultEffect<Filter.Type<F>, never, Database.Service>;
} = Function.dual(2, (feed: Feed, queryOrFilter: Query.Any | Filter.Any) => {
  const feedUri = getFeedUri(feed);
  invariant(feedUri, 'Feed must be stored in the database before accessing its contents');
  const query = Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter);
  return Database.query(query.from(Scope.feed(feedUri.toString())));
});

/**
 * Syncs the feed with the server.
 *
 * @example
 * ```ts
 * yield* Feed.sync(feed);
 * yield* Feed.sync(feed, { shouldPush: false });
 * ```
 */
export const sync = (feed: Feed, options?: SyncOptions): Effect.Effect<void, never, Database.Service> =>
  Database.Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.syncFeed(feed, options)))).pipe(
    Effect.withSpan('Feed.sync'),
  );

/**
 * Returns the feed's replication backlog for its namespace.
 *
 * @example
 * ```ts
 * const { blocksToPull, blocksToPush } = yield* Feed.getSyncState(feed);
 * ```
 */
export const getSyncState = (feed: Feed): Effect.Effect<SyncState, never, Database.Service> =>
  Database.Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.getFeedSyncState(feed)))).pipe(
    Effect.withSpan('Feed.getSyncState'),
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
export const cursor = <T = Obj.Snapshot>(_feed: Feed): Effect.Effect<Cursor<T>, never, Database.Service> =>
  Effect.succeed({ _tag: 'Cursor' } as Cursor<T>);

/**
 * Returns the next item from a feed cursor.
 * Currently stubbed — cursor operations are not yet implemented.
 */
export const next = <T = Obj.Snapshot>(_cursor: Cursor<T>): Effect.Effect<T, never, Database.Service> =>
  Effect.die('Feed.next is not yet implemented');

/**
 * Returns the next item from a feed cursor as an Option.
 * Currently stubbed — cursor operations are not yet implemented.
 */
export const nextOption = <T = Obj.Snapshot>(
  _cursor: Cursor<T>,
): Effect.Effect<Option.Option<T>, never, Database.Service> => Effect.die('Feed.nextOption is not yet implemented');

/**
 * Sets the local retention policy for a feed.
 * Currently stubbed — feeds do not yet support retention.
 *
 * @example
 * ```ts
 * yield* Feed.setRetention(feed, { count: 1000 });
 * ```
 */
// TODO(dmaretskyi): Implement when feed retention is supported.
export const setRetention = (_feed: Feed, _options: RetentionOptions): Effect.Effect<void, never, Database.Service> =>
  Effect.void;
