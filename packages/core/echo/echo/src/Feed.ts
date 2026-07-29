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
import { DXN, EID, EntityId } from '@dxos/keys';

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
 *
 * Live feed objects persist every `Obj.update` as a whole-object re-append reusing the object's id
 * (see `EchoFeedCodec.encode`), so superseded blocks accumulate indefinitely — retention/compaction
 * of those superseded blocks (driven by these options, once implemented) is the reclaim mechanism.
 * TODO(wittjosiah): Implement when feed retention is supported (see `setRetention` below and
 * `FeedStore.appendLocal`).
 */
export interface RetentionOptions {
  /** Retain items after this cursor position. */
  // TODO(wittjosiah): Use FeedCursor from @dxos/feed?
  cursor?: string;
}

/**
 * Options for {@link append}.
 */
export interface AppendOptions {
  /**
   * Explicit lineage parent for the appended items — the soft-fork point.
   * Applies to the first item only; the rest of the batch chain implicitly in append order.
   */
  parent?: Entity.Unknown | Entity.Snapshot | EntityId;
}

/**
 * Options for {@link resolveBranch}.
 */
export interface BranchOptions {
  /**
   * Item to resolve the chain from.
   * Defaults to the last item, so the most recently appended branch wins.
   */
  head?: Entity.Unknown | Entity.Snapshot | EntityId;
}

/**
 * A single resolved branch of a feed.
 */
export interface Branch<T> {
  /** The resolved chain, in append order. */
  items: T[];
  /** A parent was referenced but absent from the input, so earlier history is missing. */
  truncated: boolean;
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
 * Private-ish and on track to be removed — prefer resolving feed scopes via higher-level APIs
 * (e.g. `Feed.query`) rather than threading the raw queue URI. Used internally by the feed service
 * layer.
 */
// TODO(dmaretskyi): Remove — private-ish, prefer higher-level feed-scope APIs.
export const getFeedUri = (feed: Feed): EID.EID | undefined => EID.tryParse(Obj.getURI(feed));

//
// Operations
//

/**
 * Appends items to a feed.
 *
 * Pass `options.parent` to soft-fork the feed: the first appended item continues from that item
 * rather than from the feed's tip, so everything appended between the two drops out of the branch
 * returned by {@link resolveBranch}. Nothing is removed from the log.
 *
 * @example
 * ```ts
 * yield* Feed.append(feed, [Obj.make(Notification, { title: 'Hello' })]);
 *
 * // Continue from an earlier item, abandoning what followed it.
 * yield* Feed.append(feed, [Obj.make(Notification, { title: 'Take two' })], { parent: earlier });
 * ```
 */
export const append = (
  feed: Feed,
  items: Entity.Unknown[],
  options?: AppendOptions,
): Effect.Effect<void, never, Database.Service> =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) =>
      Effect.promise(() => {
        if (options?.parent !== undefined && items.length > 0) {
          setParent(items[0], options.parent);
        }
        return db.appendToFeed(feed, items);
      }),
    ),
  ).pipe(Effect.withSpan('Feed.append'));

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

//
// Lineage (soft fork)
//

/**
 * Foreign-key source for an item's explicit lineage parent within a feed.
 *
 * Lineage is carried in item `@meta` because feed items are arbitrary ECHO objects that the feed
 * does not own and cannot extend; `KEY_QUEUE_POSITION` rides along with feed blocks the same way.
 */
export const PARENT_KEY = 'org.dxos.key.feed-parent';

/**
 * Tri-state read of the lineage key, distinguishing an absent key from a present but malformed one.
 * A replicated id that does not parse must not read as "no parent" — that would resolve a fork as
 * an implicit continuation and silently expose the items it abandoned.
 */
const readParent = (item: Entity.Unknown | Entity.Snapshot): { present: boolean; id?: EntityId } => {
  const id = internal.getKeys(item, PARENT_KEY).at(0)?.id;
  if (id === undefined) {
    return { present: false };
  }
  return EntityId.isValid(id) ? { present: true, id } : { present: true };
};

/**
 * Returns an item's explicit lineage parent, or `undefined` when it continues from the item that
 * precedes it in append order (the default for every feed).
 *
 * Also `undefined` for a malformed stored id; {@link resolveBranch} tells the two apart and reports
 * a malformed parent as truncation.
 */
export const getParent = (item: Entity.Unknown | Entity.Snapshot): EntityId | undefined => readParent(item).id;

/**
 * Sets (or, with `undefined`, clears) an item's explicit lineage parent.
 * Call before appending the item; {@link append}'s `parent` option does this for you.
 */
export const setParent = (
  item: Entity.Unknown,
  parent: Entity.Unknown | Entity.Snapshot | EntityId | undefined,
): void => {
  internal.change(item, (mutable) => {
    internal.deleteKeys(mutable, PARENT_KEY);
    if (parent !== undefined) {
      const id = typeof parent === 'string' ? parent : parent.id;
      internal.getMetaChecked(mutable).keys.push(internal.foreignKey(PARENT_KEY, id));
    }
  });
};

/**
 * Resolves the live branch of a soft-forked feed.
 *
 * Walks backwards from the head: an item with an explicit lineage parent jumps to that item,
 * discarding everything appended in between; an item without one steps to its predecessor. So a
 * feed appended as `M1, M2, M3, M4, M5(M3)` resolves to `M1, M2, M3, M5`.
 *
 * `items` must be in **append order** — the walk is positional, and pre-sorting by a wall-clock
 * field such as `created` would corrupt it. Lineage is resolved over exactly the list passed in, so
 * a parent excluded by the caller's filter counts as absent (`truncated`), same as one that has not
 * replicated yet or whose stored id does not parse.
 *
 * @example
 * ```ts
 * const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
 * const { items, truncated } = Feed.resolveBranch(messages);
 * ```
 */
export const resolveBranch = <T extends Entity.Unknown | Entity.Snapshot>(
  items: readonly T[],
  options?: BranchOptions,
): Branch<T> => {
  const indexById = new Map<EntityId, number>();
  items.forEach((item, index) => indexById.set(item.id, index));

  const head = options?.head;
  const headIndex = head === undefined ? items.length - 1 : indexById.get(typeof head === 'string' ? head : head.id);
  if (headIndex === undefined) {
    return { items: [], truncated: true };
  }

  let cursor = headIndex;
  const chain: T[] = [];
  let truncated = false;
  while (cursor >= 0) {
    const item = items[cursor];
    chain.push(item);

    const parent = readParent(item);
    if (!parent.present) {
      cursor -= 1;
      continue;
    }
    if (parent.id === undefined) {
      // Key present but unparseable — a fork whose target cannot be identified, so stop rather than
      // fall through to the predecessor and resurrect what this item abandoned.
      truncated = true;
      break;
    }

    // A parent at or after its child is a cycle or a forward reference (possible with arbitrary
    // multi-writer data); requiring the cursor to strictly decrease also guarantees termination.
    const parentIndex = indexById.get(parent.id);
    if (parentIndex === undefined || parentIndex >= cursor) {
      truncated = true;
      break;
    }
    cursor = parentIndex;
  }

  return { items: chain.reverse(), truncated };
};

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
