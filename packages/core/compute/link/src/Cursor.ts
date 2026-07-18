//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

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
  /**
   * Opaque provider delta-resume token (Gmail `historyId`, JMAP `Email/get` `state`). An optional
   * fast-path alongside `max`/`min`: when valid the provider fetches an exact delta, else it falls back
   * to the date-window scan. Forward-only, so it cannot drive backfill.
   */
  token: Schema.String.pipe(Schema.optional),
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
 * Durable position a source-driven pipeline resumes from across runs. `spec` describes what is
 * consumed; `max`/`min`/`lastTick`/`lastError` describe progress.
 *
 * `max` is the primary opaque provider position and all a single-directional consumer reads or writes.
 * `min` is an optional lower bound, only meaningful to consumers that opted into the range-tracking
 * APIs (`extendRange`, `resolveWindows`, `completeBackfill`, `layer`'s `trackRange`).
 */
export class Cursor extends Type.makeObject<Cursor>(DXN.make('org.dxos.type.cursor', '0.2.0'))(
  Schema.Struct({
    max: Schema.String.annotations({
      title: 'Max',
      description: 'Opaque, provider-defined high-water mark identifying the newest consumed position.',
    }).pipe(Schema.optional),
    min: Schema.String.annotations({
      title: 'Min',
      description:
        'Opaque, provider-defined low-water mark some consumers maintain alongside `max`; unused by ' +
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
  readonly token?: string;
  readonly max?: string;
  readonly min?: string;
};

/** Creates an external-sync cursor: a local target kept in sync from a credentialed remote source. */
export const makeExternal = (props: MakeExternalProps): Cursor =>
  make({
    max: props.max,
    min: props.min,
    spec: {
      kind: 'external',
      source: props.source,
      target: props.target,
      externalId: props.externalId,
      label: props.label,
      snapshots: props.snapshots,
      options: props.options,
      token: props.token,
    },
  });

export type MakeFeedProps = {
  readonly source: Ref.Ref<Feed.Feed>;
  readonly target: Ref.Ref<Obj.Unknown>;
  readonly max?: string;
  readonly min?: string;
};

/** Creates a feed-to-feed cursor: an internal source processed into a local consumer. */
export const makeFeed = (props: MakeFeedProps): Cursor =>
  make({ max: props.max, min: props.min, spec: { kind: 'feed', source: props.source, target: props.target } });

/**
 * Records a successful run: advances `max` (when provided), stamps `lastTick`, clears `lastError`. The
 * single-directional write seam; a range-tracking consumer uses {@link extendRange} instead.
 */
export const advance = (cursor: Cursor, max?: string): void => {
  Obj.update(cursor, (cursor) => {
    if (max !== undefined) {
      cursor.max = max;
    }
    cursor.lastTick = new Date().toISOString();
    cursor.lastError = undefined;
  });
};

/** Records a failed run: stamps `lastError`, leaving `max`/`min`/`lastTick` untouched. */
export const recordError = (cursor: Cursor, message: string): void => {
  Obj.update(cursor, (cursor) => {
    cursor.lastError = message;
  });
};

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

/** Reads the opaque delta-resume token, or undefined when no incremental sync has captured one yet. */
export const readToken = (cursor: ExternalCursor): string | undefined => cursor.spec.token;

/** Writes the opaque delta-resume token — the incremental resume position, independent of `max`/`min`. */
export const writeToken = (cursor: ExternalCursor, token: string): void => {
  Obj.update(cursor, (cursor) => {
    if (cursor.spec.kind !== 'external') {
      return;
    }
    cursor.spec.token = token;
  });
};

/** Clears the delta-resume token, forcing the next run back onto the `max`/`min` date-window scan. */
export const clearToken = (cursor: ExternalCursor): void => {
  Obj.update(cursor, (cursor) => {
    if (cursor.spec.kind !== 'external') {
      return;
    }
    cursor.spec.token = undefined;
  });
};

/**
 * Decodes an opaque monotonic integer key (epoch timestamp, sequence number, offset). Returns `0` for
 * an absent or unparseable value. Works on either {@link Cursor.max} or {@link Cursor.min}.
 */
export const parseKey = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Serializes a monotonic integer key for storage in {@link Cursor.max} or {@link Cursor.min}. */
export const formatKey = (key: number): string => String(key);

//
// Range APIs.
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
  /** `(max, now]`, ascending: new mail since the last run. Absent only for a never-synced cursor. */
  readonly forward?: Window;
  /** `[horizon, min)`, descending: continued backfill. Absent once backfill has reached the horizon. */
  readonly backward?: Window;
};

export type ResolveWindowsOptions = {
  /** High-water key (epoch-ms), or 0 when the source hasn't synced yet. */
  readonly maxKey: number;
  /** Low-water key (epoch-ms), or 0 when unset. */
  readonly minKey: number;
  /** Reference "now" (injected for testability). */
  readonly now: Date;
  /** The sync horizon — see {@link resolveHorizon}. */
  readonly horizon: Date;
};

/**
 * Resolves the forward and backward windows a bidirectional run covers this pass:
 *  - never synced (`maxKey === 0`): backward-only over `[horizon, end)`, walked newest-first.
 *  - synced before: forward covers `(max, end)`, walked oldest-first so an interrupted run advances
 *    `max` gap-free; backward covers `[horizon, min)` (newest-first — it never advances `max`, so no
 *    gap to strand) only while the horizon hasn't reached `min` (unset `min` treated as `max`).
 * {@link completeBackfill} clamps `min` to the horizon once the backward half exhausts, stopping the
 * backward window until a wider `syncBackDays` moves the horizon below `min` again.
 */
export const resolveWindows = ({ maxKey, minKey, now, horizon }: ResolveWindowsOptions): Windows => {
  const end = addCalendarDays(now, 1);
  if (maxKey === 0) {
    return { backward: { direction: 'backward', start: horizon, end } };
  }
  const forward: Window = { direction: 'forward', start: new Date(maxKey), end };
  const effectiveLowKey = minKey > 0 ? minKey : maxKey;
  if (horizon.getTime() < effectiveLowKey) {
    return { forward, backward: { direction: 'backward', start: horizon, end: new Date(effectiveLowKey) } };
  }
  return { forward };
};

/**
 * Extends the synced range and stamps run status — the range-tracking write seam (in place of
 * {@link advance}). Raises `max` on a new high-water mark; lowers `min` on a new low-water mark
 * (`minKey: 0` leaves `min` untouched). `format` defaults to the decimal {@link formatKey}.
 *
 * Also the run-end seam for folding the run's observed key {@link Extent} in (stall-proofing).
 */
export const extendRange = (
  cursor: Cursor,
  extent: { readonly maxKey: number; readonly minKey: number },
  format: (key: number) => string = formatKey,
): void => {
  Obj.update(cursor, (cursor) => {
    const maxKey = parseKey(cursor.max);
    if (extent.maxKey > maxKey) {
      cursor.max = format(extent.maxKey);
    }
    if (extent.minKey > 0) {
      const minKey = parseKey(cursor.min);
      if (minKey === 0 || extent.minKey < minKey) {
        cursor.min = format(extent.minKey);
      }
    }
    cursor.lastTick = new Date().toISOString();
    cursor.lastError = undefined;
  });
};

/**
 * Records that a run's backward half exhausted to the horizon: clamps `min` down to `horizonKey`, never
 * up, so repeated calls and a daily-advancing horizon are no-ops. A wider `syncBackDays` reopens the
 * backward window via {@link resolveWindows}. No-op when `max` is unset (nothing synced, no floor).
 */
export const completeBackfill = (cursor: Cursor, horizonKey: number): void => {
  const maxKey = parseKey(cursor.max);
  if (maxKey === 0) {
    return;
  }
  const minKey = parseKey(cursor.min) || maxKey;
  const clamped = Math.min(minKey, horizonKey);
  if (clamped === parseKey(cursor.min)) {
    return;
  }
  Obj.update(cursor, (cursor) => {
    cursor.min = formatKey(clamped);
  });
};

//
// Run machinery.
//
// Shared machinery for running a cursor's pipeline: a Layer providing per-run state and a commit sink
// appending a page of output to the target feed. `db` comes from `Database.Service` in Requirements.
// Provider-specific stages live in the consumer. Reads only the cursor's progress fields — never
// `spec` — so it runs identically for `external` and `feed` cursors.
//

export type Stats = { newMessages: number };

/**
 * Mutable run-observed key extent, folded by {@link dedupStage} for *every* item considered, even
 * dropped ones. So a capped run whose page is entirely dropped still shrinks its window next pass: the
 * caller extends the cursor by `extent` before deciding to end or continue, guaranteeing forward
 * progress even when nothing newly commits. Read back by the caller after the run.
 */
export type Extent = { maxKey: number; minKey: number };

/**
 * Per-run state provided to the pipeline stages and commit sink. Mutable fields (`dedupSet`, `stats`,
 * `extent`) accumulate across the run; the caller reads them back afterward.
 */
export type State = {
  /** The cursor being advanced as pages commit. */
  readonly cursor: Cursor;
  /** Feed the mapped objects are appended to; absent for DB-target runs (e.g. contacts upsert). */
  readonly feed?: Feed.Feed;
  /** Foreign-key source stamped on committed items (dedup key namespace). */
  readonly foreignKeySource: string;
  /** High-water key at run start; items at/below it are already committed. */
  readonly maxKey: number;
  /** Low-water key at run start, or 0 when unset — only meaningful when {@link trackRange}. */
  readonly minKey: number;
  /** Whether this run maintains `cursor.min` alongside `cursor.max` (opt-in; see {@link Cursor.min}). */
  readonly trackRange: boolean;
  /** Foreign ids already committed (seeded from the feed, extended as pages commit). */
  readonly dedupSet: Set<string>;
  /**
   * foreignId → EntityId map for the delta's messages, built only when a `reconcileFilter` is supplied so
   * the reconcile branch can resolve an already-committed message's EntityId to retag/remove it. Absent
   * on the add-only path.
   */
  readonly foreignIndex?: ReadonlyMap<string, Obj.ID>;
  /** Serializes the advanced cursor key for storage on the cursor. */
  readonly formatCursor: (key: number) => string;
  /** Mutable run tally, read back by the caller after the run. */
  readonly stats: Stats;
  /** Mutable run-observed key extent — see {@link Extent}. */
  readonly extent: Extent;
};

/** Terminal unit produced by the pipeline for one source item: everything the commit needs to write. */
export type CommitUnit = {
  /**
   * The mapped ECHO object to append to the feed. Optional: an *objectless* unit (no feed append) carries
   * only `commitEffects` that mutate already-committed objects (e.g. a retag by EntityId), and carries
   * `key: 0` so it never moves `max`/`min`.
   */
  readonly object?: Obj.Any;
  /** Provider foreign id (the dedup key; matches `Obj.Meta.keys[].id`). */
  readonly foreignId: string;
  /** Monotonic provider key (e.g. `internalDate` / `updated` epoch-ms) used to advance the cursor. */
  readonly key: number;
  /** Deferred writes, each run (and traced) on its own span inside the commit flush — see {@link CommitEffect}. */
  readonly commitEffects?: readonly CommitEffect[];
};

/**
 * A deferred commit write recorded on a {@link CommitUnit} by a stage (which stays idempotent) and run
 * inside the commit flush. `commit` invokes each distinct function once with every unit that attached
 * it, batching a run-scoped closure reused across units into one call.
 */
export type CommitEffect = (units: readonly CommitUnit[]) => Effect.Effect<void, never, Database.Service>;

/** Effect Requirements tag carrying the per-run {@link State}. */
export class Service extends Context.Tag('@dxos/link/Cursor')<Service, State>() {}

/**
 * Dependencies supplied by the caller; the Layer seeds `dedupSet` and defaults `formatCursor`,
 * `minKey`, `trackRange`, `extent` for a single-directional caller unaware of range-tracking.
 */
export type LayerOptions = Omit<
  State,
  'dedupSet' | 'foreignIndex' | 'formatCursor' | 'minKey' | 'trackRange' | 'extent'
> & {
  readonly formatCursor?: (key: number) => string;
  /** Low-water key at run start. Only relevant with `trackRange: true`. Defaults to 0 (unset). */
  readonly minKey?: number;
  /** Opt into maintaining `cursor.min` alongside `cursor.max`. Defaults to `false`. */
  readonly trackRange?: boolean;
  /** Caller-supplied accumulator to read the run's observed key {@link Extent} back afterward. */
  readonly extent?: Extent;
  /** Overrides {@link DEFAULT_DEDUP_SEED_TAIL} — set per pipeline when its commit page size warrants it. */
  readonly dedupSeedTail?: number;
  /**
   * Selects the already-committed feed messages a reconcile run must resolve to EntityIds (caller builds
   * it as `Filter.foreignKeys(<message schema>, <delta keys>)`). {@link State.foreignIndex} is built from
   * this query rather than the whole feed, so the cost is O(delta) once the engine supports feed filter
   * pushdown. Absent on the add-only path.
   */
  readonly reconcileFilter?: Filter.Any;
};

/**
 * Builds the run Layer, seeding the committed-id dedup set from a bounded tail read of the feed (see
 * {@link DEFAULT_DEDUP_SEED_TAIL}) — closes the append→advance crash window without decoding the whole
 * feed, since the queue and space-db share no transaction.
 *
 * TODO(wittjosiah): Drop the seed entirely once feed + cursor writes can commit transactionally.
 */
export const layer = (options: LayerOptions): Layer.Layer<Service, never, Database.Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const { feed, dedupSeedTail = DEFAULT_DEDUP_SEED_TAIL } = options;
      // DB-target runs (no feed) dedup via the cursor + idempotent write; nothing to seed.
      const dedupSet = feed ? yield* seedDedupSet(feed, options.foreignKeySource, dedupSeedTail) : new Set<string>();
      // Only reconcile runs build the foreignId → EntityId map, and only for the delta's messages.
      const foreignIndex =
        feed && options.reconcileFilter
          ? yield* seedForeignIndex(feed, options.foreignKeySource, options.reconcileFilter)
          : undefined;
      return {
        ...options,
        minKey: options.minKey ?? 0,
        trackRange: options.trackRange ?? false,
        formatCursor: options.formatCursor ?? formatKey,
        extent: options.extent ?? { maxKey: 0, minKey: 0 },
        dedupSet,
        foreignIndex,
      };
    }),
  );

/** Appends the page's objects to the feed — the durable write that must precede the space-db mutations. */
const appendObjects = Effect.fn('cursor.commit.appendToFeed')(function* (
  feed: Feed.Feed,
  units: readonly CommitUnit[],
) {
  // Objectless units (e.g. retag/delete of an already-committed message) append nothing.
  const objects = units.map((unit) => unit.object).filter((object): object is Obj.Any => object !== undefined);
  if (objects.length > 0) {
    yield* Feed.append(feed, objects);
  }
});

// TODO(wittjosiah): Remove — bound the reactive cascade instead of forcing a paint gap per page.
// Yields a macrotask so the browser paints the appended objects before this page's space-db mutations
// run; otherwise append + reactive cascade run as one synchronous burst that blocks paint.
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
 * Extends the cursor to the page's key extent and records the units as committed. Raises `max`
 * unconditionally; lowers `min` only when range-tracking — so a single-directional run never touches
 * `min`, and a range-tracking run gets the symmetric watermark rule regardless of which half the page
 * came from (see {@link resolveWindows}).
 */
const recordCommitted = Effect.fn('cursor.commit.recordCommitted')(function* (
  state: State,
  units: readonly CommitUnit[],
) {
  // Fold only real keys — objectless units carry `key: 0` and must not disturb `max`/`min`.
  const keys = units.map((unit) => unit.key).filter((key) => key > 0);
  if (keys.length > 0) {
    extendRange(
      state.cursor,
      { maxKey: Math.max(...keys), minKey: state.trackRange ? Math.min(...keys) : 0 },
      state.formatCursor,
    );
  }
  for (const unit of units) {
    state.dedupSet.add(unit.foreignId);
  }
  // Count only object-bearing units as new messages; retag/delete units don't add to the feed.
  state.stats.newMessages += units.filter((unit) => unit.object !== undefined).length;
});

/**
 * Commits one page of pipeline output — the single place non-idempotent writes happen. Use as the
 * `Pipeline.run` sink after `Stream.grouped(pageSize)`.
 *
 * The feed append runs first, then space-db mutations; the two share no transaction, so a crash
 * between them leaves the page in the feed with the cursor un-advanced — the next run re-fetches it and
 * the feed-seeded dedup set drops it (advancing first would lose items). No mid-run flush (per-page
 * flushes were O(n²)); the caller flushes once at the end, so a crash only loses this run's in-memory
 * cursor advance + space mutations.
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
 * Commits a page to a DB target (no feed) via an idempotent upsert. `write` does the provider-specific
 * find-by-foreign-key → update-or-create and returns whether a new object was created (counted into
 * `stats`). Cursor advance + run status land in the same write, like {@link commit}. Idempotent, so a
 * crash before the flush is safe: the next run re-upserts.
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
 * The set half of {@link dedupStage}, keyed only by foreign id. Runs on the raw id/handle stream
 * *before* the expensive full-item fetch, so a run never downloads an already-committed item: the
 * boundary days a bidirectional run re-lists are mostly covered by the seeded `dedupSet`. Only a
 * fast-path filter — {@link dedupStage} runs after the fetch as the backstop and does the key-range
 * check. Reads {@link Service}; provider-agnostic via `getForeignId`.
 */
export const skipCommitted = <In>(
  id: string,
  getForeignId: (item: In) => string,
): Stage.Stage<In, In, never, Service> =>
  Stage.map(id, (item: In) =>
    Effect.map(Service, (state) => (state.dedupSet.has(getForeignId(item)) ? undefined : item)),
  );

/**
 * Reusable dedup stage: drops items already committed (`dedupSet`) and items strictly inside the synced
 * range (`minKey < key < maxKey`) — a cheap shortcut past the already-synced middle. Boundary keys fall
 * through to `dedupSet`, since items can share a key. A single-directional run keeps the original
 * `key < maxKey` shortcut. Folds every considered item's key into {@link State.extent} *before* the
 * drop decision, so a capped range-tracking run shrinks its window even when a whole page drops (see
 * {@link Extent}). Reads {@link Service}; provider-agnostic via `getForeignId`/`getKey`. Pair with
 * {@link skipCommitted} to avoid fetching already-committed items.
 */
export const dedupStage = <In>(
  id: string,
  getForeignId: (item: In) => string,
  getKey: (item: In) => number,
): Stage.Stage<In, In, never, Service> =>
  Stage.map(id, (item: In) =>
    Effect.gen(function* () {
      const { maxKey, minKey, trackRange, dedupSet, extent } = yield* Service;
      const key = getKey(item);
      if (key > 0) {
        extent.maxKey = Math.max(extent.maxKey, key);
        extent.minKey = extent.minKey === 0 ? key : Math.min(extent.minKey, key);
      }
      if (dedupSet.has(getForeignId(item))) {
        return undefined;
      }
      // A range run drops only the strict interior `(min, max)` so the region below `min` still
      // commits; a single-directional run keeps `key < maxKey` (also dropping a `key === 0` fallback
      // below an advanced `max`, which the range form would not).
      const interior = trackRange ? minKey < key && key < maxKey : key < maxKey;
      if (interior) {
        return undefined;
      }
      return item;
    }),
  );

/**
 * Caps a stream at `limit`, reporting each surviving item via `onTaken` so the caller can tell a
 * truncated run (`taken === limit` → re-run) from an exhausted one. Placed after {@link dedupStage} so it
 * counts only genuinely-new items. Reads no {@link Service}, but lives here as part of the per-run
 * bounding family.
 */
export const boundStage =
  <In>(limit: number, onTaken: (count: number) => void): Stage.Stage<In, In, never, never> =>
  <E0, R0>(self: Stream.Stream<In, E0, R0>) =>
    self.pipe(
      Stream.take(limit),
      Stream.tap(() => Effect.sync(() => onTaken(1))),
    );

/**
 * Default dedup-seed bound, applied to *each* end of the feed's insertion order (see
 * {@link seedDedupSet}). Only the two re-fetched boundaries (`key === max`, `key === min`) plus a
 * crash-orphaned page need seeding; the strict interior is dropped by {@link dedupStage}'s range check.
 * Sized with headroom over a typical commit page size — override via {@link LayerOptions.dedupSeedTail}.
 */
const DEFAULT_DEDUP_SEED_TAIL = 500;

/**
 * Seeds the dedup set of recently-committed foreign ids from BOTH ends of the feed's insertion order.
 *
 * The `key === max` and `key === min` boundaries both re-fetch inclusively and aren't dropped by the
 * strict-interior range check, so both must be seeded. They sit at *opposite* ends of insertion order:
 * a backfill commits `max` first and walks older, so `max`'s item is the OLDEST insertion while `min`'s
 * (plus any crash-orphaned page) is the newest — a newest-only tail would age `max` out and re-commit
 * the newest message every run. Seeding both ends covers both boundaries however forward/backward
 * interleave.
 */
/**
 * Builds a foreignId → EntityId map for the messages a reconcile run targets, selected by the caller's
 * `reconcileFilter`. Unlike {@link seedDedupSet}'s bounded tail read, reconciliation must resolve *any*
 * already-committed message (a label change can target one far older than the seed tail), but only the
 * delta's messages, not the whole feed. Foreign ids come off `Obj.getMeta(item)` (feed messages live in a
 * queue). A feed query still decodes the whole feed today, so this expresses O(delta) intent for when the
 * engine gains filter pushdown.
 */
const seedForeignIndex = (
  feed: Feed.Feed,
  foreignKeySource: string,
  reconcileFilter: Filter.Any,
): Effect.Effect<ReadonlyMap<string, Obj.ID>, never, Database.Service> =>
  Feed.query(feed, Query.select(reconcileFilter)).run.pipe(
    Effect.map((items) => {
      const index = new Map<string, Obj.ID>();
      for (const item of items) {
        for (const key of Obj.getMeta(item).keys) {
          if (key.source === foreignKeySource) {
            index.set(key.id, item.id);
          }
        }
      }
      return index;
    }),
    Effect.withSpan('cursor.seedForeignIndex'),
  );

const seedDedupSet = (
  feed: Feed.Feed,
  foreignKeySource: string,
  tail: number,
): Effect.Effect<Set<string>, never, Database.Service> =>
  // `limit` selects the newest/oldest N by insertion order (a limited feed query still decodes the
  // whole feed to apply the limit — a query-engine limitation tracked separately).
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
