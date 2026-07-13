//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Database, DXN, Feed, Filter, Obj, Order, Query, Ref, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { invariant } from '@dxos/invariant';
import { Stage } from '@dxos/pipeline';
import { Tagging, type TagIndex } from '@dxos/schema';

import * as Connection from './Connection';
import * as Cursor from './Cursor';

/**
 * One synced thing. Source = the {@link Connection} that authenticates the sync;
 * target = the local root object it syncs into (Mailbox, Kanban, Project, …).
 * Carries the per-binding sync state (cursor, timestamps, error) and the
 * last-seen remote snapshots used for three-way merge.
 *
 * Both endpoints must exist before the relation is created, so the local target
 * object is materialized when the binding is created (eager), not lazily on
 * first sync.
 */
export class SyncBinding extends Type.makeRelation<SyncBinding>(DXN.make('org.dxos.type.syncBinding', '0.2.0'))({
  source: Connection.Connection,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** Remote foreign id (board id, calendar id, channel id, etc.). */
    remoteId: Schema.String.pipe(Schema.optional),
    /** Cached display label for the remote target. */
    name: Schema.String.pipe(Schema.optional),
    /**
     * Durable progress cursor for this sync — the resume position (`value`) plus last-run status
     * (`lastRunAt`/`lastError`). A standalone {@link Cursor} object (not a sync-specific concept),
     * materialized as a child at creation. Superseded the inline `cursor`/`lastSyncAt`/`lastError`
     * fields in 0.2.0.
     */
    cursor: Ref.Ref(Cursor.Cursor),
    /**
     * Last-seen remote fields keyed by foreign id (matches `Obj.Meta.keys`).
     * Shape is provider-defined; drives pull merge `(local, remote, snapshot)` — remote wins on conflict.
     */
    snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
    /** Provider-specific options; opaque here — providers validate their shape. */
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

export const instanceOf = (value: unknown): value is SyncBinding => Relation.instanceOf(SyncBinding, value);

export type MakeProps = Omit<Relation.MakeProps<typeof SyncBinding>, 'cursor'> & {
  cursor?: Obj.MakeProps<typeof Cursor.Cursor>;
};

/**
 * Creates a `SyncBinding` relation linking a {@link Connection} to its synced local root, with a
 * fresh {@link Cursor} materialized as a child (cascade-deleted with the binding). The cursor is
 * constructed here so callers never build one; pass `cursor` to initialize its fields (`value`,
 * `lastRunAt`, `lastError`) — e.g. to seed sync state.
 */
export const make = ({ cursor: cursorProps, ...props }: MakeProps) => {
  const cursor = Cursor.make(cursorProps);
  const binding = Relation.make(SyncBinding, { ...props, cursor: Ref.make(cursor) });
  // The cursor is owned by the binding: parenting cascade-deletes it with the binding, and persists it
  // transitively when the binding is added.
  Relation.setParent(cursor, binding);
  return binding;
};

/**
 * The pre-0.2.0 `SyncBinding` shape: cursor + run status were inline string fields rather than a
 * {@link Cursor} object reference. Retained only as the `from` schema for the 0.1.0 → 0.2.0 migration
 * (see `capabilities/migrations.ts`); not used to create new bindings.
 */
export class SyncBindingV1 extends Type.makeRelation<SyncBindingV1>(DXN.make('org.dxos.type.syncBinding', '0.1.0'))({
  source: Connection.Connection,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    remoteId: Schema.String.pipe(Schema.optional),
    name: Schema.String.pipe(Schema.optional),
    cursor: Schema.String.pipe(Schema.optional),
    lastSyncAt: Format.DateTime.pipe(Schema.optional),
    lastError: Schema.String.pipe(Schema.optional),
    snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

//
// Sync pipeline.
//
// Shared machinery for running a binding's sync as a `@dxos/pipeline` pipeline: a Layer providing the
// per-run state, and a commit sink that appends a page of output to the target feed. The `db` is
// taken from `Database.Service` in the Requirements channel, so the run's stages/sink and this Layer
// are all provided at the pipeline edge. Provider-specific stages (fetch, decode, map, extract) live
// in the connector plugins.
//

export type Stats = { newMessages: number };

/**
 * The minimal shape the sync lifecycle needs from a binding: its progress cursor. `SyncBinding`
 * satisfies this structurally, as will sibling relation types (e.g. `DerivedBinding`) that have no
 * `Connection` source but still track sync progress via a cursor.
 */
export type CursorHolder = { readonly cursor: Ref.Ref<Cursor.Cursor> };

/**
 * Per-run sync state provided to the pipeline stages and the commit sink. Mutable fields (`dedupSet`,
 * `stats`) accumulate across the run; a caller that needs the result (e.g. `stats.newMessages`)
 * constructs those objects and reads them back after the run.
 */
export type State = {
  /** The binding being synced; only its cursor is read by this machinery. */
  readonly binding: CursorHolder;
  /** The binding's cursor object, advanced as pages commit (resolved from `binding.cursor`). */
  readonly cursor: Cursor.Cursor;
  /** Feed the mapped messages are appended to; absent for DB-target syncs (e.g. contacts upsert). */
  readonly feed?: Feed.Feed;
  /** Tag index provider-label tags are applied against; absent for providers that don't tag. */
  readonly tagIndex?: TagIndex.TagIndex;
  /** Foreign-key source stamped on synced messages (dedup key namespace). */
  readonly foreignKeySource: string;
  /** High-water key at run start; items at/below it are already committed. */
  readonly cursorKey: number;
  /** Foreign ids already committed (seeded from the feed, extended as pages commit). */
  readonly dedupSet: Set<string>;
  /** Serializes the advanced cursor key for storage on the binding. */
  readonly formatCursor: (key: number) => string;
  /** Mutable run tally, read back by the caller after the run. */
  readonly stats: Stats;
};

/** Terminal unit produced by the pipeline for one source item: everything the commit needs to write. */
export type CommitUnit = {
  /** The mapped ECHO object to append to the feed. */
  readonly message: Obj.Any;
  /** Provider foreign id (the dedup key; matches `Obj.Meta.keys[].id`). */
  readonly foreignId: string;
  /** Monotonic provider key (e.g. `internalDate` / `updated` epoch-ms) used to advance the cursor. */
  readonly key: number;
  /** Tag URIs to apply to the message after it is appended (provider labels/folders). */
  readonly tagUris: readonly string[];
  /** Deferred writes, each run (and traced) on its own span inside the commit flush — see {@link CommitEffect}. */
  readonly commitEffects?: readonly CommitEffect[];
};

/**
 * A deferred commit write recorded on a {@link CommitUnit} by a stage (which stays idempotent) and run
 * inside the commit flush. `commit` invokes each *distinct* function (by identity) once with every unit
 * that attached it, so a run-scoped closure reused across units batches into one call.
 */
export type CommitEffect = (units: readonly CommitUnit[]) => Effect.Effect<void, never, Database.Service>;

/** Effect Requirements tag carrying the per-run {@link State}. */
export class Service extends Context.Tag('@dxos/types/SyncBinding')<Service, State>() {}

/**
 * Dependencies supplied by the caller; the Layer seeds `dedupSet` and defaults `formatCursor` to the
 * decimal high-water key.
 */
export type LayerOptions = Omit<State, 'cursor' | 'dedupSet' | 'formatCursor'> & {
  readonly formatCursor?: (key: number) => string;
};

/**
 * Builds the sync-binding Layer, seeding the committed-id dedup set from a bounded tail read of the
 * feed (see {@link DEDUP_SEED_TAIL}) — this closes the append→advance crash window without decoding
 * the whole feed. The queue and space-db are separate stores with no shared transaction, so a page
 * can land in the feed before its cursor advance persists.
 *
 * TODO(wittjosiah): Drop the seed entirely once feed + cursor writes can commit transactionally.
 */
export const layer = (options: LayerOptions): Layer.Layer<Service, never, Database.Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const { feed } = options;
      // A binding always has its cursor (materialized at creation); a missing one is a defect.
      const cursor = yield* Database.load(options.binding.cursor).pipe(Effect.orDie);
      // DB-target syncs (no feed) rely on the cursor + idempotent write for dedup; there is no feed to seed.
      const dedupSet = feed ? yield* seedDedupSet(feed, options.foreignKeySource) : new Set<string>();
      return {
        ...options,
        cursor,
        formatCursor: options.formatCursor ?? Cursor.formatKey,
        dedupSet,
      };
    }),
  );

/**
 * Advances the cursor to `maxKey` and stamps the run status. Called from the write commit so the
 * write and the cursor advance land together — the seam the single-transaction TODO below wraps.
 *
 * Monotonic: the cursor is a *newest-seen* high-water mark, so it only ever moves forward. This is
 * what makes direction-agnostic sync correct with one cursor: a forward (incremental) run raises it;
 * an initial backward-from-today run sets it from its first (newest) page and later, older pages
 * leave it untouched; a backfill run (older-than-cursor only) never moves it — it just fills gaps.
 *
 * TODO(wittjosiah): Make the page write and this cursor advance atomic. Today they are separate
 *   stores (feed queue / space-db for {@link commit}, or two space-db mutations for
 *   {@link upsertCommit}) flushed together but not transactionally, so a crash between them can
 *   re-land a page (idempotency + the {@link layer} dedup set cover this until then). Once ECHO can
 *   commit the write and the cursor together, wrap both here and drop the dedup set.
 */
const advanceCursor = (state: State, maxKey: number): void => {
  if (maxKey > Cursor.parseKey(state.cursor.value)) {
    Cursor.advance(state.cursor, state.formatCursor(maxKey));
  } else {
    // Older-than-cursor page (backward/backfill): record the run, leave the high-water mark in place.
    Cursor.advance(state.cursor);
  }
};

/** Appends the page's messages to the feed — the durable write that must precede the space-db mutations. */
const appendMessages = Effect.fn('sync.commit.appendToFeed')(function* (feed: Feed.Feed, units: readonly CommitUnit[]) {
  yield* Feed.append(
    feed,
    units.map((unit) => unit.message),
  );
});

// TODO(wittjosiah): Remove — bound the reactive cascade instead of forcing a paint gap per page.
// Yields a macrotask so the browser paints the just-appended messages before this page's space-db
// mutations run; otherwise the append + reactive cascade run as one synchronous burst that blocks paint.
const paintYield = Effect.fn('sync.commit.paintYield')(function* () {
  yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 0)));
});

/** Applies every (message, tag) pair for the page in one `Obj.update` on the tag index (not one per pair). */
const applyTags = Effect.fn('sync.commit.tags')(function* (state: State, units: readonly CommitUnit[]) {
  if (!state.tagIndex) {
    return;
  }
  const tagEntries: { object: Obj.Any; tagId: string }[] = [];
  for (const unit of units) {
    for (const uri of unit.tagUris) {
      tagEntries.push({ object: unit.message, tagId: uri });
    }
  }
  Tagging.setBatch(tagEntries, { index: state.tagIndex });
});

/** Runs each distinct commit effect once with all the units that attached it (identity-batched). */
const runCommitEffects = Effect.fn('sync.commit.commitEffects')(function* (units: readonly CommitUnit[]) {
  const byEffect = new Map<CommitEffect, CommitUnit[]>();
  for (const unit of units) {
    for (const effect of unit.commitEffects ?? []) {
      const existing = byEffect.get(effect);
      if (existing) {
        existing.push(unit);
      } else {
        byEffect.set(effect, [unit]);
      }
    }
  }
  for (const [effect, unitsForEffect] of byEffect) {
    yield* effect(unitsForEffect);
  }
});

/** Advances the cursor to the page's high-water key and records the units as committed. */
const recordCommitted = Effect.fn('sync.commit.advanceCursor')(function* (state: State, units: readonly CommitUnit[]) {
  advanceCursor(state, Math.max(...units.map((unit) => unit.key)));
  for (const unit of units) {
    state.dedupSet.add(unit.foreignId);
  }
  state.stats.newMessages += units.length;
});

/**
 * Commits one page of pipeline output — the single place non-idempotent writes happen. Use as the
 * `Pipeline.run` sink after `Stream.grouped(pageSize)` (which also emits the trailing partial page).
 *
 * The feed append runs first, then the space-db mutations; the two stores share no transaction, so a
 * crash between them leaves the page in the feed with the cursor un-advanced — the next run re-fetches
 * it and the feed-seeded dedup set drops it (advancing first would lose messages). No mid-run flush:
 * the feed append is separately durable and the caller flushes once at the end (per-page flushes were
 * O(n²) over a run), so a crash only loses this run's in-memory cursor advance + space mutations.
 */
export const commit = (page: Chunk.Chunk<CommitUnit>): Effect.Effect<void, never, Service | Database.Service> =>
  Effect.gen(function* () {
    const units = Chunk.toReadonlyArray(page);
    if (units.length === 0) {
      return;
    }

    const state = yield* Service;
    const feed = state.feed;
    invariant(feed, 'SyncBinding.commit requires a feed target');

    yield* appendMessages(feed, units);
    yield* paintYield();
    yield* applyTags(state, units);
    yield* runCommitEffects(units);
    yield* recordCommitted(state, units);
  }).pipe(Effect.withSpan('sync.commit'));

/** An item written by {@link upsertCommit}: an object to upsert into the space plus its cursor key. */
export type UpsertUnit<T> = { readonly item: T; readonly foreignId: string; readonly key: number };

/**
 * Commits a page to a DB target (no feed) via an idempotent upsert. `write` performs the
 * provider-specific find-by-foreign-key → update-or-create and returns whether a new object was
 * created (counted into `stats`). The cursor advance + run status land in the same `Relation.update`
 * as the writes — the same commit-co-located seam as {@link commit}, so the future single-transaction
 * TODO covers both. Idempotent, so a crash before the flush is safe: the next run re-upserts.
 */
export const upsertCommit =
  <T>(write: (item: T) => Effect.Effect<boolean, never, Database.Service>) =>
  (page: Chunk.Chunk<UpsertUnit<T>>): Effect.Effect<void, never, Service | Database.Service> =>
    Effect.gen(function* () {
      const units = Chunk.toReadonlyArray(page);
      if (units.length === 0) {
        return;
      }
      const state = yield* Service;
      const { db } = yield* Database.Service;
      for (const unit of units) {
        if (yield* write(unit.item)) {
          state.stats.newMessages += 1;
        }
      }
      advanceCursor(state, Math.max(...units.map((unit) => unit.key)));
      yield* Effect.promise(() => db.flush({ indexes: true }));
      for (const unit of units) {
        state.dedupSet.add(unit.foreignId);
      }
    });

/**
 * Reusable dedup stage: drops items already committed (`dedupSet`), and — for a *forward* run — items
 * at/below the run's high-water cursor (`key < cursorKey`), a cheap shortcut to skip the already-synced
 * tail when resuming forwards. A *backward* run (initial backward-from-today or backfill) deliberately
 * fetches keys below the cursor, so it must NOT apply that shortcut and relies on `dedupSet` alone.
 * Reads the run state from {@link Service}; provider-agnostic via the `getForeignId` / `getKey` accessors.
 */
export const dedupStage = <In>(
  id: string,
  getForeignId: (item: In) => string,
  getKey: (item: In) => number,
  { direction = 'forward' }: { direction?: 'forward' | 'backward' } = {},
): Stage.Stage<In, In, never, Service> =>
  Stage.map(id, (item: In) =>
    Effect.gen(function* () {
      const { cursorKey, dedupSet } = yield* Service;
      if (dedupSet.has(getForeignId(item))) {
        return undefined;
      }
      if (direction === 'forward' && getKey(item) < cursorKey) {
        return undefined;
      }
      return item;
    }),
  );

/**
 * Bound on the dedup seed. The set only needs feed messages whose key is at/after the cursor
 * high-water: the last committed page plus at most one crash-orphaned page (append and cursor-advance
 * flush per page, so a crash leaves ≤1 un-cursored page). Everything older is dropped by
 * {@link dedupStage}'s `key < cursorKey` check, so the newest N (by insertion order) suffice. Sized
 * with generous headroom over any provider's commit page size.
 */
const DEDUP_SEED_TAIL = 500;

/** Seeds the dedup set of recently-committed foreign ids from the newest {@link DEDUP_SEED_TAIL} feed items. */
const seedDedupSet = (feed: Feed.Feed, foreignKeySource: string): Effect.Effect<Set<string>, never, Database.Service> =>
  // `Order.natural('desc')` + `limit` selects the newest N by insertion order (a limited feed query
  // still decodes the whole feed to apply the limit — a query-engine limitation tracked separately).
  Feed.query(feed, Query.select(Filter.everything()).orderBy(Order.natural('desc')).limit(DEDUP_SEED_TAIL)).run.pipe(
    Effect.map(
      (items) =>
        new Set(
          items.flatMap((item) =>
            Obj.getMeta(item)
              .keys.filter((key) => key.source === foreignKeySource)
              .map((key) => key.id),
          ),
        ),
    ),
    Effect.withSpan('sync.seedDedupSet', { attributes: { limit: DEDUP_SEED_TAIL } }),
  );
