//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, Feed, Filter, Obj, Order, Query, Ref, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';
import { invariant } from '@dxos/invariant';
import { Stage } from '@dxos/pipeline';

import * as AccessToken from './AccessToken';

//
// Spec.
//
// What a cursor tracks progress against — a source-driven pipeline is either syncing an external,
// credentialed remote source into a local target (`external`), or processing one internal source
// into a local consumer (`feed`, e.g. a mailbox's message feed into a fact store). Both kinds share
// `source`/`target`; only `external` carries the remote-specific fields (credential, foreign id,
// merge state). Distinguished by `kind`, mirroring the canonical discriminated-spec pattern (see
// `Kanban.Spec` in `@dxos/plugin-kanban`).
//

export const ExternalSpec = Schema.Struct({
  kind: Schema.Literal('external'),
  /** Credential authenticating the remote source. */
  source: Ref.Ref(AccessToken.AccessToken),
  /** Local root object synced into (Mailbox, Kanban, Project, …). */
  target: Ref.Ref(Obj.Unknown),
  /** Remote foreign id (board id, calendar id, channel id, etc.). */
  externalId: Schema.String.pipe(Schema.optional),
  /** Cached display label for the remote target. */
  label: Schema.String.pipe(Schema.optional),
  /** Provider-specific options; opaque here — providers validate their shape. */
  options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  /** Last-seen remote fields keyed by foreign id (matches `Obj.Meta.keys`); drives 3-way merge. */
  snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
});
export type ExternalSpec = Schema.Schema.Type<typeof ExternalSpec>;

export const FeedSpec = Schema.Struct({
  kind: Schema.Literal('feed'),
  /** Source feed being consumed. */
  source: Ref.Ref(Feed.Feed),
  /** Local consumer of the processed output (e.g. a fact store). */
  target: Ref.Ref(Obj.Unknown),
});
export type FeedSpec = Schema.Schema.Type<typeof FeedSpec>;

/** Discriminated union of what a cursor tracks progress against. Distinguished by `kind`. */
export const Spec = Schema.Union(ExternalSpec, FeedSpec);
export type Spec = Schema.Schema.Type<typeof Spec>;

/**
 * Tracks progress consuming data from (or exchanging data with) a source — the durable position a
 * pipeline resumes from across runs. `spec` describes what is being consumed (external sync or
 * internal feed-to-feed); `value`/`lastTick`/`lastError` describe how far it got.
 *
 * `value` is opaque and provider-defined (a timestamp high-water mark, a provider change token, an
 * offset, …).
 */
export class Cursor extends Type.makeObject<Cursor>(DXN.make('org.dxos.type.cursor', '0.2.0'))(
  Schema.Struct({
    value: Schema.String.annotations({
      title: 'Value',
      description: 'Opaque, provider-defined high-water mark identifying the last consumed position.',
    }).pipe(Schema.optional),
    lastTick: Format.DateTime.pipe(Schema.annotations({ title: 'Last tick' }), Schema.optional),
    lastError: Schema.String.pipe(Schema.annotations({ title: 'Last error' }), Schema.optional),
    spec: Spec,
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--map-pin--regular', hue: 'amber' }),
    HiddenAnnotation.set(true),
    Schema.annotations({ description: 'Durable progress cursor for a source-driven pipeline.' }),
  ),
) {}

export const instanceOf = (value: unknown): value is Cursor => Obj.instanceOf(Cursor, value);

export const make = (props: Obj.MakeProps<typeof Cursor>): Cursor => Obj.make(Cursor, props);

/** Narrowed external-sync cursor. */
export type ExternalCursor = Cursor & { spec: ExternalSpec };

/** Narrowed feed-to-feed cursor. */
export type FeedCursor = Cursor & { spec: FeedSpec };

export const isExternal = (cursor: Cursor): cursor is ExternalCursor => cursor.spec.kind === 'external';

export const isFeed = (cursor: Cursor): cursor is FeedCursor => cursor.spec.kind === 'feed';

export type MakeExternalProps = {
  readonly source: Ref.Ref<AccessToken.AccessToken>;
  readonly target: Ref.Ref<Obj.Unknown>;
  readonly externalId?: string;
  readonly label?: string;
  readonly snapshots?: Record<string, any>;
  readonly options?: Record<string, any>;
  readonly value?: string;
};

/** Creates an external-sync cursor: a local target kept in sync from a credentialed remote source. */
export const makeExternal = (props: MakeExternalProps): Cursor =>
  make({
    value: props.value,
    spec: {
      kind: 'external',
      source: props.source,
      target: props.target,
      externalId: props.externalId,
      label: props.label,
      snapshots: props.snapshots,
      options: props.options,
    },
  });

export type MakeFeedProps = {
  readonly source: Ref.Ref<Feed.Feed>;
  readonly target: Ref.Ref<Obj.Unknown>;
  readonly value?: string;
};

/** Creates a feed-to-feed cursor: an internal source processed into a local consumer. */
export const makeFeed = (props: MakeFeedProps): Cursor =>
  make({ value: props.value, spec: { kind: 'feed', source: props.source, target: props.target } });

/**
 * Records a successful run: advances `value` when a new high-water mark is provided, stamps
 * `lastTick`, and clears `lastError`. Pass no `value` to record a run that produced nothing new
 * (status refreshed, position unchanged). The single write seam any pipeline uses on success.
 */
export const advance = (cursor: Cursor, value?: string): void =>
  Obj.update(cursor, (cursor) => {
    if (value !== undefined) {
      cursor.value = value;
    }
    cursor.lastTick = new Date().toISOString();
    cursor.lastError = undefined;
  });

/** Records a failed run: stamps `lastError`, leaving `value` and `lastTick` untouched. */
export const recordError = (cursor: Cursor, message: string): void =>
  Obj.update(cursor, (cursor) => {
    cursor.lastError = message;
  });

/**
 * Encodes a monotonic integer high-water mark into the opaque `value` string — the common convention
 * for a cursor that tracks an incrementing position (epoch timestamp, sequence number, offset).
 * Returns `0` for an absent or unparseable value.
 */
export const parseKey = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Serializes a monotonic integer high-water mark for storage in {@link Cursor.value}. */
export const formatKey = (key: number): string => String(key);

/** Which end of the [start, end) range a sync walk begins from. */
export type Direction = 'forward' | 'backward';

/** A resolved sync range plus the direction its provider should walk it. */
export type Window = {
  readonly direction: Direction;
  /** Inclusive-ish lower (oldest) bound. */
  readonly start: Date;
  /** Exclusive upper (newest) bound. */
  readonly end: Date;
};

export type ResolveWindowOptions = {
  /** High-water cursor key (epoch-ms), or 0 when the source hasn't synced yet. */
  readonly cursorKey: number;
  /** Reference "now" (injected for testability). */
  readonly now: Date;
  /** Oldest bound (the horizon) — epoch-ms or a `Date`-parseable string. */
  readonly after?: string | number;
  /** Newest bound — epoch-ms or a `Date`-parseable string. Backfill passes the oldest-synced date. */
  readonly before?: string | number;
  /** Override the walk direction; otherwise inferred from the cursor. */
  readonly direction?: Direction;
  /** Horizon expressed as days-before-now (from binding options); takes precedence over `after`. */
  readonly syncBackDays?: number;
  /** Horizon used when neither `syncBackDays` nor `after` is given. */
  readonly defaultSyncBackDays?: number;
};

/** Calendar-day arithmetic (not fixed 24h increments), matching `date-fns`'s `addDays`/`subDays`. */
const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Resolves the range and direction a sync should cover, shared across providers so their
 * bidirectional/backfill behavior stays identical:
 *  - no cursor → `backward`: initial sync, newest-first from `end` (today) down to the horizon.
 *  - cursor → `forward`: incremental, from the cursor up to `end`.
 *  - `direction: 'backward'` + `before` = oldest-synced → backfill older gaps (the monotonic cursor
 *    guard means these older keys never advance it).
 * Direction sets the walk order; both cover the same `[start, end)` range.
 */
export const resolveWindow = ({
  cursorKey,
  now,
  after,
  before,
  direction,
  syncBackDays,
  defaultSyncBackDays = 30, // TODO(burdon): Should be 90
}: ResolveWindowOptions): Window => {
  const resolved: Direction = direction ?? (cursorKey > 0 ? 'forward' : 'backward');
  // A backward backfill's horizon is `syncBackDays` before `before` (the anchor it walks back from),
  // not before `now` — else a `before` far in the past would leave the horizon after it, inverting
  // the range.
  const horizonAnchor = resolved === 'backward' && before !== undefined ? new Date(before) : now;
  const horizon =
    syncBackDays !== undefined
      ? addCalendarDays(horizonAnchor, -syncBackDays)
      : after !== undefined
        ? new Date(after)
        : addCalendarDays(now, -defaultSyncBackDays);
  const end = before !== undefined ? new Date(before) : addCalendarDays(now, 1);
  // Forward resumes from the cursor (else the horizon); backward covers the whole [horizon, end).
  const start = resolved === 'forward' && cursorKey > 0 ? new Date(cursorKey) : horizon;
  return { direction: resolved, start, end };
};

//
// Run machinery.
//
// Shared machinery for running a cursor's pipeline: a Layer providing the per-run state, and a
// commit sink that appends a page of output to the target feed. The `db` is taken from
// `Database.Service` in the Requirements channel, so the run's stages/sink and this Layer are all
// provided at the pipeline edge. Provider-specific stages (fetch, decode, map, extract) live in the
// consumer (connector plugins, fact pipelines, …). Reads only the cursor's progress fields — never
// `spec` — so it runs identically for `external` and `feed` cursors.
//

export type Stats = { newMessages: number };

/**
 * Per-run state provided to the pipeline stages and the commit sink. Mutable fields (`dedupSet`,
 * `stats`) accumulate across the run; a caller that needs the result (e.g. `stats.newMessages`)
 * constructs those objects and reads them back after the run.
 */
export type State = {
  /** The cursor being advanced as pages commit. */
  readonly cursor: Cursor;
  /** Feed the mapped objects are appended to; absent for DB-target runs (e.g. contacts upsert). */
  readonly feed?: Feed.Feed;
  /** Foreign-key source stamped on committed items (dedup key namespace). */
  readonly foreignKeySource: string;
  /** High-water key at run start; items at/below it are already committed. */
  readonly cursorKey: number;
  /** Foreign ids already committed (seeded from the feed, extended as pages commit). */
  readonly dedupSet: Set<string>;
  /** Serializes the advanced cursor key for storage on the cursor. */
  readonly formatCursor: (key: number) => string;
  /** Mutable run tally, read back by the caller after the run. */
  readonly stats: Stats;
};

/** Terminal unit produced by the pipeline for one source item: everything the commit needs to write. */
export type CommitUnit = {
  /** The mapped ECHO object to append to the feed. */
  readonly object: Obj.Any;
  /** Provider foreign id (the dedup key; matches `Obj.Meta.keys[].id`). */
  readonly foreignId: string;
  /** Monotonic provider key (e.g. `internalDate` / `updated` epoch-ms) used to advance the cursor. */
  readonly key: number;
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
export class Service extends Context.Tag('@dxos/link/Cursor')<Service, State>() {}

/**
 * Dependencies supplied by the caller; the Layer seeds `dedupSet` and defaults `formatCursor` to the
 * decimal high-water key.
 */
export type LayerOptions = Omit<State, 'dedupSet' | 'formatCursor'> & {
  readonly formatCursor?: (key: number) => string;
  /** Overrides {@link DEFAULT_DEDUP_SEED_TAIL} — set per pipeline when its commit page size warrants it. */
  readonly dedupSeedTail?: number;
};

/**
 * Builds the run Layer, seeding the committed-id dedup set from a bounded tail read of the feed (see
 * {@link DEFAULT_DEDUP_SEED_TAIL}) — this closes the append→advance crash window without decoding the
 * whole feed. The queue and space-db are separate stores with no shared transaction, so a page can
 * land in the feed before its cursor advance persists.
 *
 * TODO(wittjosiah): Drop the seed entirely once feed + cursor writes can commit transactionally.
 */
export const layer = (options: LayerOptions): Layer.Layer<Service, never, Database.Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const { feed, dedupSeedTail = DEFAULT_DEDUP_SEED_TAIL } = options;
      // DB-target runs (no feed) rely on the cursor + idempotent write for dedup; there is no feed to seed.
      const dedupSet = feed ? yield* seedDedupSet(feed, options.foreignKeySource, dedupSeedTail) : new Set<string>();
      return {
        ...options,
        formatCursor: options.formatCursor ?? formatKey,
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
  if (maxKey > parseKey(state.cursor.value)) {
    advance(state.cursor, state.formatCursor(maxKey));
  } else {
    // Older-than-cursor page (backward/backfill): record the run, leave the high-water mark in place.
    advance(state.cursor);
  }
};

/** Appends the page's objects to the feed — the durable write that must precede the space-db mutations. */
const appendObjects = Effect.fn('cursor.commit.appendToFeed')(function* (
  feed: Feed.Feed,
  units: readonly CommitUnit[],
) {
  yield* Feed.append(
    feed,
    units.map((unit) => unit.object),
  );
});

// TODO(wittjosiah): Remove — bound the reactive cascade instead of forcing a paint gap per page.
// Yields a macrotask so the browser paints the just-appended objects before this page's space-db
// mutations run; otherwise the append + reactive cascade run as one synchronous burst that blocks paint.
const paintYield = Effect.fn('cursor.commit.paintYield')(function* () {
  yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 0)));
});

/** Runs each distinct commit effect once with all the units that attached it (identity-batched). */
const runCommitEffects = Effect.fn('cursor.commit.commitEffects')(function* (units: readonly CommitUnit[]) {
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
const recordCommitted = Effect.fn('cursor.commit.advanceCursor')(function* (
  state: State,
  units: readonly CommitUnit[],
) {
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
 * it and the feed-seeded dedup set drops it (advancing first would lose items). No mid-run flush:
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
    invariant(feed, 'Cursor.commit requires a feed target');

    yield* appendObjects(feed, units);
    yield* paintYield();
    yield* runCommitEffects(units);
    yield* recordCommitted(state, units);
  }).pipe(Effect.withSpan('cursor.commit'));

/** An item written by {@link upsertCommit}: an object to upsert into the space plus its cursor key. */
export type UpsertUnit<T> = { readonly item: T; readonly foreignId: string; readonly key: number };

/**
 * Commits a page to a DB target (no feed) via an idempotent upsert. `write` performs the
 * provider-specific find-by-foreign-key → update-or-create and returns whether a new object was
 * created (counted into `stats`). The cursor advance + run status land in the same `Relation.update`-
 * style write as the writes — the same commit-co-located seam as {@link commit}, so the future
 * single-transaction TODO covers both. Idempotent, so a crash before the flush is safe: the next run
 * re-upserts.
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
 * Default bound on the dedup seed. The set only needs feed items whose key is at/after the cursor
 * high-water: the last committed page plus at most one crash-orphaned page (append and cursor-advance
 * flush per page, so a crash leaves ≤1 un-cursored page). Everything older is dropped by
 * {@link dedupStage}'s `key < cursorKey` check, so the newest N (by insertion order) suffice. Sized
 * with generous headroom over a typical provider's commit page size — override via
 * {@link LayerOptions.dedupSeedTail} for a pipeline whose page size warrants a different bound.
 */
const DEFAULT_DEDUP_SEED_TAIL = 500;

/** Seeds the dedup set of recently-committed foreign ids from the newest `tail` feed items. */
const seedDedupSet = (
  feed: Feed.Feed,
  foreignKeySource: string,
  tail: number,
): Effect.Effect<Set<string>, never, Database.Service> =>
  // `Order.natural('desc')` + `limit` selects the newest N by insertion order (a limited feed query
  // still decodes the whole feed to apply the limit — a query-engine limitation tracked separately).
  Feed.query(feed, Query.select(Filter.everything()).orderBy(Order.natural('desc')).limit(tail)).run.pipe(
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
    Effect.withSpan('cursor.seedDedupSet', { attributes: { limit: tail } }),
  );
