//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { KEY_QUEUE_POSITION } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EID, EntityId } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import type * as Filter from './Filter.ts';
import * as internal from './internal/index.ts';
import * as Obj from './Obj.ts';
import * as Query from './Query.ts';
import type * as QueryResult from './QueryResult.ts';
import * as Scope from './Scope.ts';
import * as Type from './Type.ts';

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
    namespace: Schema.optional(Schema.Literals(['data', 'trace'])),

    /**
     * Earliest item a pending rewind discards — set when a soft fork is decided but not yet expressed,
     * because the writer may be a different process than the one that decided it.
     *
     * Stored as the first *discarded* item rather than the new parent so that rewinding to the very
     * first item needs no sentinel: nothing precedes it, so the continuation simply starts a new line.
     * Readers show what precedes it; the next append parents to that and clears this.
     *
     * Transient intent, never a source of truth for history. The fork itself lives in item lineage
     * (see {@link PARENT_KEY}), which is what {@link history} walks and what replicates in a defined
     * order relative to the blocks.
     */
    rewindFrom: Schema.optional(Obj.ID.pipe(internal.FormInputAnnotation.set(false))),
  }).pipe(
    internal.HiddenAnnotation.set(true),
    Annotation.IconAnnotation.set({ icon: 'ph--rows--regular', hue: 'yellow' }),
  ),
) {}

//
// Types
//

/**
 * Opaque position of a feed item — the insertion id the position authority assigned its block,
 * as read from an item with {@link getCursor}. Ordering is the feed's append order; a reader
 * resumes by passing the last cursor it processed to {@link query}.
 */
export const Cursor = Schema.String.pipe(Schema.brand('@dxos/echo/Feed/Cursor'));
export type Cursor = Schema.Schema.Type<typeof Cursor>;

/**
 * Annotation holding a reader's position in a feed — the cursor it has consumed up to.
 *
 * An annotation rather than a `@meta` foreign key: a key identifies the same entity in another
 * system, which a checkpoint is not.
 *
 * @example
 * ```ts
 * const cursor = Annotation.get(reader, Feed.CursorAnnotation).pipe(Option.getOrElse(() => Feed.START));
 * Obj.update(reader, (reader) => Annotation.set(reader, Feed.CursorAnnotation, Feed.getCursor(item)!));
 * ```
 */
export const CursorAnnotation: Annotation.Annotation<Cursor> = Annotation.make({
  id: 'org.dxos.annotation.feed-cursor',
  schema: Cursor,
});

/**
 * Sentinel cursor preceding every item — "read from the beginning".
 *
 * A sentinel rather than `undefined` so a stored checkpoint is always a `Cursor`: a reader that has
 * processed nothing yet holds this, and the same code path resumes it as resumes a live cursor.
 */
export const START: Cursor = Cursor.make('');

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
 * Options for {@link history}.
 */
export interface HistoryOptions {
  /**
   * Item to walk the history from, as git's `HEAD` selects which commits are reachable.
   * Defaults to the last item, so the most recently appended line of items wins.
   */
  head?: Entity.Unknown | Entity.Snapshot | EntityId;
}

/**
 * The items reachable from a head by following lineage — a feed's equivalent of
 * `git log --first-parent`.
 */
export interface History<T> {
  /** The reachable items, in append order. */
  items: T[];
  /**
   * A parent was referenced but could not be resolved, so the walk stopped at a boundary and
   * earlier history is missing — the same condition as a git shallow clone.
   */
  shallow: boolean;
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
export class ContextFeedService extends Context.Service<
  ContextFeedService,
  {
    readonly feed: Feed;
  }
>()('@dxos/echo/Feed/ContextFeedService') {}

/** Provides {@link ContextFeedService} so callers can scope operations to `feed`. */
export const layer = (feed: Feed) => Layer.succeed(ContextFeedService, { feed });

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
 * rather than from the feed's tip, so everything appended between the two becomes unreachable from
 * {@link history}. Nothing is removed from the log.
 *
 * @example
 * ```ts
 * yield* Feed.append(feed, [Obj.make(Notification, { title: 'Hello' })]);
 *
 * // Continue from an earlier item, leaving what followed it unreachable.
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
  ).pipe(Effect.withSpan('Feed.append'), Database.withSpaceId);

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
  ).pipe(Effect.withSpan('Feed.remove'), Database.withSpaceId);

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
 * Foreign-key source for the global position a position authority assigned a feed item.
 * Exposed alongside {@link getPosition} so callers can stamp or inspect it without reaching for
 * `@dxos/protocols`.
 */
export const POSITION_KEY = KEY_QUEUE_POSITION;

/**
 * The global position a feed item was assigned, or `+Infinity` when it has none — a block written
 * locally and not yet acknowledged, which sorts last because it is the newest.
 *
 * Use this to put items into append order before calling {@link history}: a query returns an unordered
 * set, and `created` is a wall clock that peers do not agree on.
 *
 * @example
 * ```ts
 * const inAppendOrder = Array.sort(messages, Order.mapInput(Order.number, Feed.getPosition));
 * const { items } = Feed.history(inAppendOrder);
 * ```
 */
export const getPosition = (item: Entity.Unknown | Entity.Snapshot): number => {
  const key = internal.getKeys(item, KEY_QUEUE_POSITION).at(0)?.id;
  const position = key !== undefined ? Number(key) : Number.NaN;
  return Number.isNaN(position) ? Number.POSITIVE_INFINITY : position;
};

/**
 * The item's {@link Cursor}, or `undefined` when it has none — a block written locally and not yet
 * acknowledged by the position authority. Pass it to {@link query} to resume after this item.
 */
export const getCursor = (item: Entity.Unknown | Entity.Snapshot): Cursor | undefined => {
  const key = internal.getKeys(item, KEY_QUEUE_POSITION).at(0)?.id;
  return key !== undefined ? Cursor.make(key) : undefined;
};

/**
 * Returns an item's explicit lineage parent, or `undefined` when it continues from the item that
 * precedes it in append order (the default for every feed).
 *
 * Also `undefined` for a malformed stored id; {@link history} tells the two apart and reports
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
 * Returns the items reachable from a head by following lineage — a feed's `git log --first-parent`.
 *
 * Walks backwards from the head: an item with an explicit lineage parent jumps to that item, leaving
 * everything appended in between unreachable; an item without one steps to its predecessor. So a
 * feed appended as `M1, M2, M3, M4, M5(M3)` yields `M1, M2, M3, M5`, with `M4` unreachable but still
 * present in the log — the log is the object store, this function is what HEAD reaches.
 *
 * `items` must be in **append order** — the walk is positional, and pre-sorting by a wall-clock
 * field such as `created` would corrupt it. Lineage is resolved over exactly the list passed in, so
 * a parent excluded by the caller's filter reads as absent (`shallow`), same as one that has not
 * replicated yet or whose stored id does not parse.
 *
 * @example
 * ```ts
 * const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
 * const { items, shallow } = Feed.history(messages);
 * ```
 */
export const history = <T extends Entity.Unknown | Entity.Snapshot>(
  items: readonly T[],
  options?: HistoryOptions,
): History<T> => {
  const indexById = new Map<EntityId, number>();
  items.forEach((item, index) => indexById.set(item.id, index));

  const head = options?.head;
  const headIndex = head === undefined ? items.length - 1 : indexById.get(typeof head === 'string' ? head : head.id);
  if (headIndex === undefined) {
    return { items: [], shallow: true };
  }

  let cursor = headIndex;
  const reachable: T[] = [];
  let shallow = false;
  while (cursor >= 0) {
    const item = items[cursor];
    reachable.push(item);

    const parent = readParent(item);
    if (!parent.present) {
      cursor -= 1;
      continue;
    }
    if (parent.id === undefined) {
      // Key present but unparseable — a fork whose target cannot be identified, so stop rather than
      // fall through to the predecessor and make what this item superseded reachable again.
      shallow = true;
      break;
    }

    // A parent at or after its child is a cycle or a forward reference (possible with arbitrary
    // multi-writer data); requiring the cursor to strictly decrease also guarantees termination.
    const parentIndex = indexById.get(parent.id);
    if (parentIndex === undefined || parentIndex >= cursor) {
      shallow = true;
      break;
    }
    cursor = parentIndex;
  }

  return { items: reachable.reverse(), shallow };
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
 *
 * // Resume after a cursor, reading a bounded page of what is new:
 * const objects = yield* Feed.query(feed, Query.select(Filter.feedCursor(cursor)).limit(10)).run;
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
    Database.withSpaceId,
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
    Database.withSpaceId,
  );

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
