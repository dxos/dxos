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
 * internal feed-to-feed); `high`/`low`/`lastTick`/`lastError` describe how far it got.
 *
 * The object itself is a neutral position holder — it imposes no range semantics. `high` is the
 * primary, opaque provider-defined position (a timestamp high-water mark, a provider change token, an
 * offset, …) and is all a single-directional consumer (pull-forward-only sync, a DB upsert target,
 * …) ever reads or writes — see `advance`, `parseKey`/`formatKey`. `low` is an optional secondary
 * position some consumers maintain alongside `high` to additionally track a lower bound (e.g. a
 * contiguous synced range `[low, high]` for a bidirectional sync); it means nothing on its own and is
 * only meaningful to a consumer that opted into the range-tracking APIs (`extendRange`,
 * `resolveHorizon`/`resolveWindows`, `completeBackfill`, the `layer` `trackRange` option).
 */
export class Cursor extends Type.makeObject<Cursor>(DXN.make('org.dxos.type.cursor', '0.2.0'))(
  Schema.Struct({
    high: Schema.String.annotations({
      title: 'High',
      description: 'Opaque, provider-defined high-water mark identifying the newest consumed position.',
    }).pipe(Schema.optional),
    low: Schema.String.annotations({
      title: 'Low',
      description:
        'Opaque, provider-defined low-water mark some consumers maintain alongside `high`; unused by ' +
        'single-directional consumers.',
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
  readonly high?: string;
  readonly low?: string;
};

/** Creates an external-sync cursor: a local target kept in sync from a credentialed remote source. */
export const makeExternal = (props: MakeExternalProps): Cursor =>
  make({
    high: props.high,
    low: props.low,
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
  readonly high?: string;
  readonly low?: string;
};

/** Creates a feed-to-feed cursor: an internal source processed into a local consumer. */
export const makeFeed = (props: MakeFeedProps): Cursor =>
  make({ high: props.high, low: props.low, spec: { kind: 'feed', source: props.source, target: props.target } });

/**
 * Records a successful run: advances `high` when a new high-water mark is provided, stamps
 * `lastTick`, and clears `lastError`. Pass no `high` to record a run that produced nothing new
 * (status refreshed, position unchanged). The single-directional write seam a pull-forward-only
 * consumer uses directly on success; a range-tracking consumer uses {@link extendRange} instead.
 */
export const advance = (cursor: Cursor, high?: string): void =>
  Obj.update(cursor, (cursor) => {
    if (high !== undefined) {
      cursor.high = high;
    }
    cursor.lastTick = new Date().toISOString();
    cursor.lastError = undefined;
  });

/** Records a failed run: stamps `lastError`, leaving `high`/`low`/`lastTick` untouched. */
export const recordError = (cursor: Cursor, message: string): void =>
  Obj.update(cursor, (cursor) => {
    cursor.lastError = message;
  });

/**
 * Reads `cursor.spec.snapshots[foreignId]` typed as `T` — the last-seen remote fields an external
 * sync recorded for a foreign id, driving the per-field three-way merge (see the `mergeField`/
 * `mergeDeep` primitives in `@dxos/app-toolkit`'s `ConnectorSync`). Returns undefined if absent.
 */
export const readSnapshot = <T extends object>(cursor: ExternalCursor, foreignId: string): T | undefined => {
  const snapshots = (cursor.spec.snapshots ?? {}) as Record<string, unknown>;
  return snapshots[foreignId] as T | undefined;
};

/**
 * Writes `cursor.spec.snapshots[foreignId] = snapshot`. Allocates a fresh map so the assignment is
 * safe under ECHO's structural-sharing semantics.
 */
export const writeSnapshot = (cursor: ExternalCursor, foreignId: string, snapshot: object): void => {
  Obj.update(cursor, (cursor) => {
    if (cursor.spec.kind !== 'external') {
      return;
    }
    const existing = (cursor.spec.snapshots ?? {}) as Record<string, unknown>;
    cursor.spec.snapshots = { ...existing, [foreignId]: snapshot };
  });
};

/**
 * Encodes a monotonic integer high-water mark into an opaque key string — the common convention for a
 * cursor that tracks an incrementing position (epoch timestamp, sequence number, offset). Returns `0`
 * for an absent or unparseable value. Works on either {@link Cursor.high} or {@link Cursor.low}.
 */
export const parseKey = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Serializes a monotonic integer key for storage in {@link Cursor.high} or {@link Cursor.low}. */
export const formatKey = (key: number): string => String(key);

//
// Range APIs.
//
// Everything below works with the `low`/`high` pair to resolve and extend a contiguous synced range
// `[low, high]` — opt-in for a bidirectional sync; a single-directional consumer never calls these and
// never sets `low`.
//

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

/** Calendar-day arithmetic (not fixed 24h increments), matching `date-fns`'s `addDays`/`subDays`. */
const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export type ResolveHorizonOptions = {
  /** Reference "now" (injected for testability). */
  readonly now: Date;
  /** Horizon expressed as days-before-now (from binding options). */
  readonly syncBackDays?: number;
  /** Horizon used when `syncBackDays` is absent. */
  readonly defaultSyncBackDays?: number;
};

/** Resolves how far back a sync should reach: `syncBackDays` (or the default) before `now`. */
export const resolveHorizon = ({
  now,
  syncBackDays,
  defaultSyncBackDays = 30, // TODO(burdon): Should be 90
}: ResolveHorizonOptions): Date => addCalendarDays(now, -(syncBackDays ?? defaultSyncBackDays));

/** The two halves of a bidirectional run; either may be absent (nothing to do on that side). */
export type Windows = {
  /** `(high, now]`, ascending: new mail since the last run. Absent only for a never-synced cursor. */
  readonly forward?: Window;
  /** `[horizon, low)`, descending: continued backfill. Absent once backfill has reached the horizon. */
  readonly backward?: Window;
};

export type ResolveWindowsOptions = {
  /** High-water key (epoch-ms), or 0 when the source hasn't synced yet. */
  readonly highKey: number;
  /** Low-water key (epoch-ms), or 0 when unset. */
  readonly lowKey: number;
  /** Reference "now" (injected for testability). */
  readonly now: Date;
  /** The sync horizon — see {@link resolveHorizon}. */
  readonly horizon: Date;
};

/**
 * Resolves the forward and backward windows a bidirectional sync run should cover this pass, shared
 * across providers:
 *  - never synced (`highKey === 0`): no forward half; backward covers the whole `[horizon, end)`,
 *    walked newest-first so recent mail lands first.
 *  - synced before (`highKey > 0`): forward always covers `(high, end)`, walked oldest-first so an
 *    interrupted or capped run advances `high` gap-free; backward covers `[horizon, low)` — walked
 *    newest-first, since it never advances `high` and so has no gap to strand — only while the horizon
 *    hasn't yet reached `low` (an unset `low` is treated as `high`, i.e. nothing backfilled yet).
 * Once a run's backward half exhausts to the horizon, {@link completeBackfill} clamps `low` down to it
 * and this resolver stops emitting a backward window — until a wider `syncBackDays` moves the horizon
 * below `low` again.
 */
export const resolveWindows = ({ highKey, lowKey, now, horizon }: ResolveWindowsOptions): Windows => {
  const end = addCalendarDays(now, 1);
  if (highKey === 0) {
    return { backward: { direction: 'backward', start: horizon, end } };
  }
  const forward: Window = { direction: 'forward', start: new Date(highKey), end };
  const effectiveLowKey = lowKey > 0 ? lowKey : highKey;
  if (horizon.getTime() < effectiveLowKey) {
    return { forward, backward: { direction: 'backward', start: horizon, end: new Date(effectiveLowKey) } };
  }
  return { forward };
};

/**
 * Extends the cursor's synced range and stamps the run status — the range-tracking write seam a
 * bidirectional pipeline uses on success (in place of {@link advance}). Raises `high` when `extent.maxKey`
 * is a new high-water mark; lowers `low` when `extent.minKey` is a new low-water mark (pass `minKey: 0`
 * to leave `low` untouched, e.g. for a page known to be entirely on the forward side). `format`
 * serializes a key (defaults to the decimal {@link formatKey}).
 *
 * Also used to fold a capped run's *scanned* extent (not just what committed) into the cursor before
 * deciding whether to end or continue — see {@link Scanned}'s doc for why that matters.
 */
export const extendRange = (
  cursor: Cursor,
  extent: { readonly maxKey: number; readonly minKey: number },
  format: (key: number) => string = formatKey,
): void =>
  Obj.update(cursor, (cursor) => {
    const highKey = parseKey(cursor.high);
    if (extent.maxKey > highKey) {
      cursor.high = format(extent.maxKey);
    }
    if (extent.minKey > 0) {
      const lowKey = parseKey(cursor.low);
      if (lowKey === 0 || extent.minKey < lowKey) {
        cursor.low = format(extent.minKey);
      }
    }
    cursor.lastTick = new Date().toISOString();
    cursor.lastError = undefined;
  });

/**
 * Records that a run's backward half exhausted all the way to the horizon (as opposed to being capped
 * mid-way): clamps `low` down to `horizonKey`, never up, so repeated calls and a horizon that advances
 * daily are no-ops. A later `syncBackDays` widening moves the horizon below `low` again, and
 * {@link resolveWindows} reopens the backward window from there. No-op when `high` is unset (nothing
 * synced yet, so there is no floor to clamp).
 */
export const completeBackfill = (cursor: Cursor, horizonKey: number): void => {
  const highKey = parseKey(cursor.high);
  if (highKey === 0) {
    return;
  }
  const lowKey = parseKey(cursor.low) || highKey;
  const clamped = Math.min(lowKey, horizonKey);
  if (clamped === parseKey(cursor.low)) {
    return;
  }
  Obj.update(cursor, (cursor) => {
    cursor.low = formatKey(clamped);
  });
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
 * Mutable run-observed key extent, folded by {@link dedupStage} for *every* item it considers —
 * regardless of whether the item is dropped. A capped run whose scanned page is entirely dropped (e.g.
 * a crash re-lands already-committed items right at the cap boundary) still shrinks its window next
 * pass: the caller extends the cursor by `scanned` before deciding whether to end or continue, so a
 * run that scans anything always makes forward progress even when nothing newly commits. Read back by
 * the caller after the run, same pattern as `stats`.
 */
export type Scanned = { maxKey: number; minKey: number };

/**
 * Per-run state provided to the pipeline stages and the commit sink. Mutable fields (`dedupSet`,
 * `stats`, `scanned`) accumulate across the run; a caller that needs the result (e.g.
 * `stats.newMessages`) constructs those objects and reads them back after the run.
 */
export type State = {
  /** The cursor being advanced as pages commit. */
  readonly cursor: Cursor;
  /** Feed the mapped objects are appended to; absent for DB-target runs (e.g. contacts upsert). */
  readonly feed?: Feed.Feed;
  /** Foreign-key source stamped on committed items (dedup key namespace). */
  readonly foreignKeySource: string;
  /** High-water key at run start; items at/below it are already committed. */
  readonly highKey: number;
  /** Low-water key at run start, or 0 when unset — only meaningful when {@link trackRange}. */
  readonly lowKey: number;
  /** Whether this run maintains `cursor.low` alongside `cursor.high` (opt-in; see {@link Cursor.low}). */
  readonly trackRange: boolean;
  /** Foreign ids already committed (seeded from the feed, extended as pages commit). */
  readonly dedupSet: Set<string>;
  /** Serializes the advanced cursor key for storage on the cursor. */
  readonly formatCursor: (key: number) => string;
  /** Mutable run tally, read back by the caller after the run. */
  readonly stats: Stats;
  /** Mutable run-observed key extent — see {@link Scanned}. */
  readonly scanned: Scanned;
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
 * Dependencies supplied by the caller; the Layer seeds `dedupSet`, defaults `formatCursor` to the
 * decimal high-water key, and defaults `lowKey`/`trackRange`/`scanned` for a single-directional caller
 * that doesn't know about range-tracking.
 */
export type LayerOptions = Omit<State, 'dedupSet' | 'formatCursor' | 'lowKey' | 'trackRange' | 'scanned'> & {
  readonly formatCursor?: (key: number) => string;
  /** Low-water key at run start. Only relevant with `trackRange: true`. Defaults to 0 (unset). */
  readonly lowKey?: number;
  /** Opt into maintaining `cursor.low` alongside `cursor.high`. Defaults to `false`. */
  readonly trackRange?: boolean;
  /** Caller-supplied accumulator to read the run's scanned extent back afterward — see {@link Scanned}. */
  readonly scanned?: Scanned;
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
        lowKey: options.lowKey ?? 0,
        trackRange: options.trackRange ?? false,
        formatCursor: options.formatCursor ?? formatKey,
        scanned: options.scanned ?? { maxKey: 0, minKey: 0 },
        dedupSet,
      };
    }),
  );

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

/**
 * Extends the cursor to the page's key extent and records the units as committed. Raises `high` to the
 * page's max key unconditionally; lowers `low` to the page's min key only when the run is
 * range-tracking — so a single-directional run (`trackRange: false`) never touches `low`, and a
 * range-tracking run gets the symmetric watermark rule for free regardless of which half (forward or
 * backward) the page came from, or whether it straddles both (see {@link resolveWindows}'s doc).
 */
const recordCommitted = Effect.fn('cursor.commit.recordCommitted')(function* (
  state: State,
  units: readonly CommitUnit[],
) {
  const keys = units.map((unit) => unit.key);
  extendRange(
    state.cursor,
    { maxKey: Math.max(...keys), minKey: state.trackRange ? Math.min(...keys) : 0 },
    state.formatCursor,
  );
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
      extendRange(state.cursor, { maxKey: Math.max(...units.map((unit) => unit.key)), minKey: 0 }, state.formatCursor);
      yield* Effect.promise(() => db.flush({ indexes: true }));
      for (const unit of units) {
        state.dedupSet.add(unit.foreignId);
      }
    });

/**
 * The set half of {@link dedupStage}, keyed only by foreign id (no item key). Runs on the raw id/handle
 * stream *before* the expensive full-item fetch, so a run never downloads an item it has already
 * committed: the two boundary windows a bidirectional run re-lists (the high- and low-water days) are
 * mostly covered by the seeded `dedupSet`, so this drops them up front. It is only a fast-path filter,
 * not the authority — {@link dedupStage} still runs after the fetch as the backstop for anything the
 * bounded seed didn't cover (e.g. a boundary day denser than the seed), and does the key-range check
 * that needs the fetched item's key. Reads {@link Service}; provider-agnostic via `getForeignId`.
 */
export const skipCommitted = <In>(
  id: string,
  getForeignId: (item: In) => string,
): Stage.Stage<In, In, never, Service> =>
  Stage.map(id, (item: In) =>
    Effect.map(Service, (state) => (state.dedupSet.has(getForeignId(item)) ? undefined : item)),
  );

/**
 * Reusable dedup stage: drops items already committed (`dedupSet`), and items strictly inside the run's
 * already-synced range (`lowKey < key < highKey`) — a cheap shortcut to skip the already-synced middle
 * without consulting `dedupSet`. Boundary keys (`key === lowKey` or `key === highKey`) fall through to
 * `dedupSet` instead, since multiple items can share a key and only some may have committed. For a
 * single-directional run (`lowKey` defaults to 0), this degenerates to the original `key < highKey`
 * shortcut. Also folds every considered item's key into {@link State.scanned} *before* the drop decision
 * — including dropped items — so a capped range-tracking run can still shrink its window even when a
 * whole page is dropped (see {@link Scanned}). Reads the run state from {@link Service}; provider-agnostic
 * via the `getForeignId`/`getKey` accessors. Runs after the full-item fetch; pair it with
 * {@link skipCommitted} on the id stream to avoid fetching already-committed items in the first place.
 */
export const dedupStage = <In>(
  id: string,
  getForeignId: (item: In) => string,
  getKey: (item: In) => number,
): Stage.Stage<In, In, never, Service> =>
  Stage.map(id, (item: In) =>
    Effect.gen(function* () {
      const { highKey, lowKey, dedupSet, scanned } = yield* Service;
      const key = getKey(item);
      if (key > 0) {
        scanned.maxKey = Math.max(scanned.maxKey, key);
        scanned.minKey = scanned.minKey === 0 ? key : Math.min(scanned.minKey, key);
      }
      if (dedupSet.has(getForeignId(item))) {
        return undefined;
      }
      if (lowKey < key && key < highKey) {
        return undefined;
      }
      return item;
    }),
  );

/**
 * Default bound on the dedup seed, applied to *each* end of the feed's insertion order (see
 * {@link seedDedupSet}). Only items at the two re-fetched window boundaries — `key === high` and
 * `key === low` — plus a crash-orphaned page need to be in the set (everything strictly inside the
 * range is dropped by {@link dedupStage}'s range check). Those boundaries sit at opposite ends of
 * insertion order, hence seeding both ends. Sized with generous headroom over a typical provider's
 * commit page size — override via {@link LayerOptions.dedupSeedTail} for a pipeline whose page size
 * warrants a different bound.
 */
const DEFAULT_DEDUP_SEED_TAIL = 500;

/**
 * Seeds the dedup set of recently-committed foreign ids from BOTH ends of the feed's insertion order.
 *
 * The forward half re-fetches `key === high` and the backward half re-fetches `key === low` (both
 * inclusive, to catch same-key siblings a commit page split); the range check only drops the strict
 * interior, so those two boundary items must be in the dedup set. They sit at *opposite* ends of
 * insertion order: a backfilling sync commits the newest message (`high`) first and walks older, so
 * `high`'s item is the OLDEST insertion while `low`'s (plus any crash-orphaned page) is the newest — a
 * newest-only tail ages `high` out once more than `tail` older items backfill after it, silently
 * re-committing the newest message every run. Seeding the newest `tail` ∪ the oldest `tail` covers
 * both boundaries regardless of how forward/backward interleave (once new mail arrives, `high`'s item
 * becomes the newest insertion instead — still covered).
 */
const seedDedupSet = (
  feed: Feed.Feed,
  foreignKeySource: string,
  tail: number,
): Effect.Effect<Set<string>, never, Database.Service> =>
  // `limit` on each end selects the newest/oldest N by insertion order (a limited feed query still
  // decodes the whole feed to apply the limit — a query-engine limitation tracked separately).
  Effect.all([
    Feed.query(feed, Query.select(Filter.everything()).orderBy(Order.natural('desc')).limit(tail)).run,
    Feed.query(feed, Query.select(Filter.everything()).orderBy(Order.natural('asc')).limit(tail)).run,
  ]).pipe(
    Effect.map(
      ([newest, oldest]) =>
        new Set(
          [...newest, ...oldest].flatMap((item) =>
            Obj.getMeta(item)
              .keys.filter((key) => key.source === foreignKeySource)
              .map((key) => key.id),
          ),
        ),
    ),
    Effect.withSpan('cursor.seedDedupSet', { attributes: { limit: tail } }),
  );
