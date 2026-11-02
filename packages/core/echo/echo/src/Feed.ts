//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { KEY_FEED_BLOCK, KEY_FEED_BRANCH, KEY_FEED_FORK, KEY_FEED_PREV, KEY_QUEUE_POSITION } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EID, EntityId } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import * as Filter from './Filter.ts';
import * as internal from './internal/index.ts';
import * as Obj from './Obj.ts';
import * as Order from './Order.ts';
import * as Query from './Query.ts';
import type * as QueryResult from './QueryResult.ts';
import * as Scope from './Scope.ts';
import * as Type from './Type.ts';

//
// Options
//

/** The namespaces a feed can store its data under; `data` is the default. */
export const Namespace = Schema.Literals(['data', 'trace']);
export type Namespace = Schema.Schema.Type<typeof Namespace>;

/**
 * Indexing options for a feed. Absent on a feed means indexing is enabled.
 *
 * A struct rather than a bare boolean so later options (which indexes to build) need no migration.
 */
export const IndexingOptions = Schema.Struct({
  /** When false, the feed's items are not indexed at all; there is no partial mode. */
  enabled: Schema.Boolean,
  /**
   * Which branches the index holds: `main` (the default) or `all`. There is no selected subset.
   * A feed whose items mutate objects keeps `main`; a feed of messages from people can index `all`.
   */
  mode: Schema.optional(Schema.Literals(['all', 'main'])),
});
export type IndexingOptions = Schema.Schema.Type<typeof IndexingOptions>;

/**
 * Retention options for a feed. With both limits set, an item is dropped when it breaks either;
 * an empty struct (or no `retention` on the feed) trims nothing.
 *
 * Live feed objects persist every `Obj.update` as a whole-object re-append, so superseded blocks are
 * trimmed by these limits like any other block; retention does not compact them.
 */
export const RetentionOptions = Schema.Struct({
  /** Maximum number of items kept; the oldest beyond it are dropped. */
  maxLength: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1)), Schema.optional),

  /**
   * Maximum age of an item in milliseconds, measured from its append timestamp.
   * Milliseconds rather than a `Duration` because ECHO stores plain JSON; {@link setRetention} converts.
   */
  maxAge: Schema.Finite.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.optional),
});
export type RetentionOptions = Schema.Schema.Type<typeof RetentionOptions>;

/**
 * A feed's indexing and retention options, as the indexer carries them down to the feed store.
 */
export const FeedOptions = Schema.Struct({
  indexing: Schema.optional(IndexingOptions),
  retention: Schema.optional(RetentionOptions),
});
export type FeedOptions = Schema.Schema.Type<typeof FeedOptions>;

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
    namespace: Schema.optional(Namespace),

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

    /** Indexing options; absent means indexing is enabled. Set with {@link setIndexing}. */
    indexing: IndexingOptions.pipe(internal.FormInputAnnotation.set(false), Schema.optional),

    /** Retention options; absent means nothing is trimmed. Set with {@link setRetention}. */
    retention: RetentionOptions.pipe(internal.FormInputAnnotation.set(false), Schema.optional),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--rows--regular', hue: 'yellow' })),
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
 * Input to {@link setRetention}: {@link RetentionOptions} with `maxAge` as any Duration input.
 */
export interface SetRetentionOptions {
  /** Maximum number of items kept; an integer of at least 1. */
  maxLength?: number;
  /** Maximum age of an item, measured from its append timestamp; must be positive and finite. */
  maxAge?: Duration.Input;
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

  /** The branch the appended items continue; omit for the root branch. */
  branch?: BranchId;
}

/**
 * Options for {@link fork}.
 */
export interface ForkOptions {
  /**
   * The fork point: the item (at the block it was read from) or the block id that the new branch
   * continues from. Its branch is the parent of the new branch.
   */
  at: Entity.Unknown | Entity.Snapshot | BlockId;
}

/**
 * Options for {@link walk}.
 */
export interface WalkOptions {
  /** The branch the walk ends on; omit for the root branch, or for the branch of `begin` on a backward walk. */
  branch?: BranchId | null;
  /** Starts after this item; read it off the last item of a page with {@link getLocalCursor}. */
  begin?: LocalCursor;
  /** Also gives the base item of each branch that forks at a block the walk gives. */
  forks?: boolean;
  /** `asc` walks from the root base to the branch; `desc` walks back to the root base. Defaults to `asc`. */
  order?: 'asc' | 'desc';
  /** The page size. */
  limit?: number;
}

/**
 * Options for {@link query}.
 */
export interface QueryOptions {
  /**
   * Branches to read: branch ids, `null` for the main branch, or `'all'`. Defaults to the main branch only,
   * so a private branch never reaches a reader that did not ask for it. Read a branch's ancestors with
   * `'all'` (or the branches on its path) and pass the items to {@link readBranch}.
   */
  branches?: Scope.FeedScopeOptions['branches'];
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

/**
 * Provides {@link ContextFeedService} so callers can scope operations to `feed`.
 *
 * @performance O(1).
 */
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
 *
 * @performance O(1); allocates an in-memory feed object.
 */
// TODO(wittjosiah): How to control the feed namespace (data/trace)? Why do feeds have namespaces?
export const make = (props: Obj.MakeProps<typeof Feed> = {}): Feed => Obj.make(Feed, props);

/**
 * Returns the feed object's EID when the feed is stored in a space.
 *
 * Private-ish and on track to be removed — prefer resolving feed scopes via higher-level APIs
 * (e.g. `Feed.query`) rather than threading the raw queue URI. Used internally by the feed service
 * layer.
 *
 * @performance O(1) URI parse.
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
 *
 * @performance Async; O(n) in items encoded and appended in one batch.
 */
export const append = (
  feed: Feed,
  items: Entity.Unknown[],
  options?: AppendOptions,
): Effect.Effect<void, never, Database.Service> =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) =>
      Effect.flatMap(Database.Origin, (origin) =>
        Effect.promise(() => {
          if (options?.parent !== undefined && items.length > 0) {
            setParent(items[0], options.parent);
          }
          if (options?.branch !== undefined) {
            const branch = options.branch;
            items.forEach((item) => internal.change(item, (mutable) => setBranchKey(mutable, branch)));
          }
          return db.appendToFeed(feed, items, { origin });
        }),
      ),
    ),
  ).pipe(Effect.withSpan('Feed.append'), Database.withSpaceId);

/**
 * Removes items from a feed.
 *
 * @example
 * ```ts
 * yield* Feed.remove(feed, [item]);
 * ```
 *
 * @performance Async; O(n) in items, deleted by id in one batch.
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
          { branches: items.map((item) => getBranch(item) ?? null) },
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
 *
 * @performance O(k) in the item foreign-key count.
 */
export const getPosition = (item: Entity.Unknown | Entity.Snapshot): number => {
  const key = internal.getKeys(item, KEY_QUEUE_POSITION).at(0)?.id;
  const position = key !== undefined ? Number(key) : Number.NaN;
  return Number.isNaN(position) ? Number.POSITIVE_INFINITY : position;
};

/**
 * The item's {@link Cursor}, or `undefined` when it has none — a block written locally and not yet
 * acknowledged by the position authority. Pass it to {@link query} to resume after this item.
 *
 * @performance O(k) in the item foreign-key count.
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
 *
 * @performance O(k) in the item foreign-key count.
 */
export const getParent = (item: Entity.Unknown | Entity.Snapshot): EntityId | undefined => readParent(item).id;

/**
 * Sets (or, with `undefined`, clears) an item's explicit lineage parent.
 * Call before appending the item; {@link append}'s `parent` option does this for you.
 *
 * @performance O(k) in the item foreign-key count, applied in one change.
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
 *
 * @performance O(n) in items; one pass to index ids and one backwards walk.
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

//
// Branches
//

/**
 * The id of a branch: the block id (`<sequence>@<actorId>`) of the base block of the branch, as an
 * opaque string. The root branch has no id; scopes and the index name it `null`.
 */
export const BranchId = Schema.String.pipe(Schema.brand('@dxos/echo/Feed/BranchId'));
export type BranchId = Schema.Schema.Type<typeof BranchId>;

/** The id of a block within its feed, `<sequence>@<actorId>`. */
export type BlockId = string;

/**
 * The foreign-key sources a store stamps on an item from the block it was read from: its block id, its
 * branch, its fork flag (as the fork point) and its predecessor. A copy of the item into another feed
 * drops them, since that feed has none of those blocks or branches.
 */
export const BLOCK_KEYS: readonly string[] = [KEY_FEED_BLOCK, KEY_FEED_BRANCH, KEY_FEED_FORK, KEY_FEED_PREV];

/**
 * The position of a walk on one device: the branch the walk is on and the last block it gave. Read it
 * off an item with {@link getLocalCursor}; another device cannot use it.
 */
export const LocalCursor = Schema.String.pipe(Schema.brand('@dxos/echo/Feed/LocalCursor'));
export type LocalCursor = Schema.Schema.Type<typeof LocalCursor>;

// A live object this client wrote carries the keys of its latest block hidden, so they never notify.
const keyOf = (item: Entity.Unknown | Entity.Snapshot, source: string): string | undefined =>
  (internal.getFeedBlockKeys(item) ?? internal.getKeys(item, source)).find((key) => key.source === source)?.id;

/** Writes the branch key into an open change, so a caller can batch it with its other writes. */
const setBranchKey = (mutable: Entity.Mutable<Entity.Unknown>, branch: BranchId): void => {
  internal.deleteKeys(mutable, KEY_FEED_BRANCH);
  internal.getMetaChecked(mutable).keys.push(internal.foreignKey(KEY_FEED_BRANCH, branch));
};

/**
 * The branch of an item, as the store inferred it from the block the item was read from; `undefined`
 * on the root branch.
 *
 * @performance O(k) in the item foreign-key count.
 */
export const getBranch = (item: Entity.Unknown | Entity.Snapshot): BranchId | undefined => {
  const branch = keyOf(item, KEY_FEED_BRANCH);
  return branch === undefined ? undefined : BranchId.make(branch);
};

/**
 * True when the item was read from the base block of a branch: its fork flag is set, and its
 * predecessor is the fork point.
 *
 * @performance O(k) in the item foreign-key count.
 */
export const isFork = (item: Entity.Unknown | Entity.Snapshot): boolean => keyOf(item, KEY_FEED_FORK) !== undefined;

/**
 * The id of the block the item was read from; `undefined` on an item the store has not echoed yet.
 *
 * @performance O(k) in the item foreign-key count.
 */
export const getBlockId = (item: Entity.Unknown | Entity.Snapshot): BlockId | undefined => keyOf(item, KEY_FEED_BLOCK);

/**
 * The id of the predecessor of the block the item was read from: the head of its branch when it was
 * written, or the fork point of a base block; `undefined` on the first block of a feed.
 *
 * @performance O(k) in the item foreign-key count.
 */
export const getPredecessor = (item: Entity.Unknown | Entity.Snapshot): BlockId | undefined =>
  keyOf(item, KEY_FEED_PREV);

/**
 * The cursor a walk resumes after this item; `undefined` on an item the store has not echoed yet.
 *
 * @performance O(k) in the item foreign-key count.
 */
export const getLocalCursor = (item: Entity.Unknown | Entity.Snapshot): LocalCursor | undefined => {
  const block = getBlockId(item);
  return block === undefined ? undefined : LocalCursor.make(`${getBranch(item) ?? ''}|${block}`);
};

/**
 * Starts a new branch: the first item is appended as the base block of the branch, with the fork
 * point `at` as its predecessor, and the rest continue the branch. Returns the id of the branch, the
 * block id of its base, once the base is written.
 *
 * @example
 * ```ts
 * const branch = yield* Feed.fork(feed, [reply], { at: message });
 * yield* Feed.append(feed, [followUp], { branch });
 * ```
 *
 * @performance Async; one append for the base, then one for the rest.
 */
export const fork = Effect.fn('Feed.fork')(function* (
  feed: Feed,
  items: Entity.Unknown[],
  options: ForkOptions,
): Effect.fn.Return<BranchId, never, Database.Service> {
  const { db } = yield* Database.Service;
  const [base, ...rest] = items;
  invariant(base !== undefined, 'fork: pass at least the base item');
  const branch = yield* Effect.promise(() => db.forkFeed(feed, base, { at: options.at }));
  if (rest.length > 0) {
    yield* append(feed, rest, { branch });
  }
  return branch;
}, Database.withSpaceId);

/**
 * Returns what a read of one branch sees: the items of its ancestors up to each fork point, then the
 * items of the branch itself. Omit `branch` for the root branch.
 *
 * A feed appended as `A1, A2, A3, B1(fork at A2), A4, B2` reads `A1, A2, A3, A4` on the root branch and
 * `A1, A2, B1, B2` on branch `B1`.
 *
 * `items` must be in **append order**, as read from the feed with `branches: 'all'`. The read is
 * `shallow` when the base of a branch or its fork point is missing from `items` (a base or fork point
 * that was updated is read at its latest block, which is not the one the branch names); the branch's
 * own items are still returned. A walk ({@link walk}) reads blocks, so it has no such gap.
 *
 * @performance O(n) in items; one pass to group them and one walk up the branch's ancestors.
 */
export const readBranch = <T extends Entity.Unknown | Entity.Snapshot>(
  items: readonly T[],
  branch?: BranchId,
): History<T> => {
  const indexByBlock = new Map<BlockId, number>();
  const byBranch = new Map<BranchId | undefined, number[]>();
  items.forEach((item, index) => {
    const block = getBlockId(item);
    if (block !== undefined) {
      indexByBlock.set(block, index);
    }
    const key = getBranch(item);
    const members = byBranch.get(key) ?? [];
    members.push(index);
    byBranch.set(key, members);
  });

  const resolve = (target: BranchId | undefined): { indices: number[]; shallow: boolean } => {
    const own = byBranch.get(target) ?? [];
    if (target === undefined) {
      return { indices: own, shallow: false };
    }
    const baseIndex = indexByBlock.get(target);
    const forkPoint = baseIndex === undefined ? undefined : keyOf(items[baseIndex], KEY_FEED_FORK);
    // A fork point at or after the base is a cycle or a forward reference; requiring it to be strictly
    // earlier also makes each step up the tree move to an earlier base, so the walk ends.
    const forkIndex = forkPoint === undefined ? undefined : indexByBlock.get(forkPoint);
    if (baseIndex === undefined || forkIndex === undefined || forkIndex >= baseIndex) {
      return { indices: own, shallow: true };
    }
    const parent = resolve(getBranch(items[forkIndex]));
    return { indices: [...parent.indices.filter((index) => index <= forkIndex), ...own], shallow: parent.shallow };
  };

  const { indices, shallow } = resolve(branch);
  return { items: indices.map((index) => items[index]), shallow };
};

/**
 * Walks a feed along the path from the root branch to `branch`, in local order: a wrapper of the
 * walk query, which reads the same as
 *
 * ```ts
 * Database.query(
 *   Query.select(Filter.and(filter, Filter.feedCursor({ begin, positions: 'local' })))
 *     .from(Scope.feed(feedUri, { walk: { branch, forks } }))
 *     .orderBy(Order.natural(order))
 *     .limit(limit),
 * );
 * ```
 *
 * A forward walk gives each branch on the path up to the fork point of the next; a backward walk
 * goes from `begin` (or the head of `branch`) back to the root base. Each item comes once, at the place
 * of its first block on the path, with the content of its latest one. Resume with {@link getLocalCursor}
 * of the last item of a page.
 *
 * @performance O(1) to build; a page reads every block of the path.
 */
export const walk = <F extends Filter.Any>(
  feed: Feed,
  filter: F,
  options: WalkOptions = {},
): QueryResult.QueryResultEffect<Filter.Type<F>, never, Database.Service> => {
  const feedUri = getFeedUri(feed);
  invariant(feedUri, 'Feed must be stored in the database before accessing its contents');
  const select =
    options.begin === undefined
      ? filter
      : Filter.and(filter, Filter.feedCursor({ begin: options.begin, positions: 'local' }));
  const query = Query.select(select)
    .from(Scope.feed(feedUri.toString(), { walk: { branch: options.branch, forks: options.forks } }))
    .orderBy(Order.natural(options.order ?? 'asc'));
  return Database.query(options.limit === undefined ? query : query.limit(options.limit));
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
 *
 * @performance O(1) to build; the result is lazy, so nothing executes until read.
 */
export const query: {
  <Q extends Query.Any>(
    feed: Feed,
    query: Q,
    options?: QueryOptions,
  ): QueryResult.QueryResultEffect<Query.Type<Q>, never, Database.Service>;
  <F extends Filter.Any>(
    feed: Feed,
    filter: F,
    options?: QueryOptions,
  ): QueryResult.QueryResultEffect<Filter.Type<F>, never, Database.Service>;
  <Q extends Query.Any>(
    query: Q,
  ): (feed: Feed) => QueryResult.QueryResultEffect<Query.Type<Q>, never, Database.Service>;
  <F extends Filter.Any>(
    filter: F,
  ): (feed: Feed) => QueryResult.QueryResultEffect<Filter.Type<F>, never, Database.Service>;
  // Data-first takes two or three arguments; data-last takes one, so arity alone tells them apart.
} = Function.dual(
  (args) => args.length >= 2,
  (feed: Feed, queryOrFilter: Query.Any | Filter.Any, options?: QueryOptions) => {
    const feedUri = getFeedUri(feed);
    invariant(feedUri, 'Feed must be stored in the database before accessing its contents');
    const query = Query.is(queryOrFilter) ? queryOrFilter : Query.select(queryOrFilter);
    return Database.query(query.from(Scope.feed(feedUri.toString(), { branches: options?.branches })));
  },
);

/**
 * Syncs the feed with the server.
 *
 * @example
 * ```ts
 * yield* Feed.sync(feed);
 * yield* Feed.sync(feed, { shouldPush: false });
 * ```
 *
 * @performance Async; network-bound, proportional to the replication backlog.
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
 *
 * @performance Async; one service round trip.
 */
export const getSyncState = (feed: Feed): Effect.Effect<SyncState, never, Database.Service> =>
  Database.Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.getFeedSyncState(feed)))).pipe(
    Effect.withSpan('Feed.getSyncState'),
    Database.withSpaceId,
  );

/**
 * Sets the feed's indexing options on the feed object, in one change.
 *
 * Returns once the change is applied locally; the store stops indexing on its own index pass, which
 * may run on another device.
 *
 * @example
 * ```ts
 * yield* Feed.setIndexing(feed, { enabled: false });
 * ```
 *
 * @performance O(1); one object change.
 */
export const setIndexing = (feed: Feed, options: IndexingOptions): Effect.Effect<void, Schema.SchemaError> =>
  Schema.decodeUnknownEffect(IndexingOptions)(options).pipe(
    Effect.map((indexing) =>
      Obj.update(feed, (feed) => {
        feed.indexing = indexing;
      }),
    ),
    Effect.asVoid,
    Effect.withSpan('Feed.setIndexing'),
  );

/**
 * Sets the feed's retention options on the feed object, in one change.
 *
 * Fails with the schema error, leaving the object unchanged, when `maxLength` is not an integer of
 * at least 1 or `maxAge` is not a positive, finite duration. Returns once the change is applied
 * locally; the store trims on its own index pass, which may run on another device.
 *
 * @example
 * ```ts
 * yield* Feed.setRetention(feed, { maxLength: 1000, maxAge: Duration.days(7) });
 * ```
 *
 * @performance O(1); one object change.
 */
export const setRetention = (feed: Feed, options: SetRetentionOptions): Effect.Effect<void, Schema.SchemaError> =>
  Schema.decodeUnknownEffect(RetentionOptions)({
    // Keys are omitted rather than set to undefined, which ECHO does not store.
    ...(options.maxLength !== undefined ? { maxLength: options.maxLength } : {}),
    ...(options.maxAge !== undefined ? { maxAge: durationToMillis(options.maxAge) } : {}),
  }).pipe(
    Effect.map((retention) =>
      Obj.update(feed, (feed) => {
        feed.retention = retention;
      }),
    ),
    Effect.asVoid,
    Effect.withSpan('Feed.setRetention'),
  );

/** An unparseable duration maps to NaN so the schema, not this conversion, reports it. */
const durationToMillis = (input: Duration.Input): number =>
  Duration.fromInput(input).pipe(
    Option.map(Duration.toMillis),
    Option.getOrElse(() => Number.NaN),
  );
