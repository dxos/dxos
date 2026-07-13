//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

/**
 * Tracks progress consuming data from (or exchanging data with) a source — the durable position a
 * pipeline resumes from across runs, independent of any one integration. Not sync-specific: a sync
 * binding, an importer, or any source-driven pipeline can reference one.
 *
 * `value` is opaque and provider-defined (a timestamp high-water mark, a provider change token, an
 * offset, …); `lastRunAt` / `lastError` record the outcome of the most recent run.
 */
export class Cursor extends Type.makeObject<Cursor>(DXN.make('org.dxos.type.cursor', '0.1.0'))(
  Schema.Struct({
    value: Schema.String.annotations({
      title: 'Value',
      description: 'Opaque, provider-defined high-water mark identifying the last consumed position.',
    }).pipe(Schema.optional),
    lastRunAt: Format.DateTime.pipe(Schema.annotations({ title: 'Last run' }), Schema.optional),
    lastError: Schema.String.pipe(Schema.annotations({ title: 'Last error' }), Schema.optional),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--map-pin--regular', hue: 'amber' }),
    HiddenAnnotation.set(true),
    Schema.annotations({ description: 'Durable progress cursor for a source-driven pipeline.' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Cursor> = {}): Cursor => Obj.make(Cursor, props);

export const instanceOf = (value: unknown): value is Cursor => Obj.instanceOf(Cursor, value);

/**
 * Records a successful run: advances `value` when a new high-water mark is provided, stamps
 * `lastRunAt`, and clears `lastError`. Pass no `value` to record a run that produced nothing new
 * (status refreshed, position unchanged). The single write seam any pipeline uses on success.
 */
export const advance = (cursor: Cursor, value?: string): void =>
  Obj.update(cursor, (cursor) => {
    if (value !== undefined) {
      cursor.value = value;
    }
    cursor.lastRunAt = new Date().toISOString();
    cursor.lastError = undefined;
  });

/** Records a failed run: stamps `lastError`, leaving `value` and `lastRunAt` untouched. */
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

/**
 * A pipeline sink that commits a page of items and advances the cursor to the page's high-water key —
 * the seam that makes a run idempotent (a re-run resumes from here). `write` performs the
 * provider-specific write for the page; `keyOf` extracts each item's monotonic key; `format` serializes
 * it (defaults to {@link formatKey}). Use after `Stream.grouped(pageSize)` with `Pipeline.run({ sink })`.
 */
export const commit =
  <T, E = never, R = never>(options: {
    cursor: Cursor;
    write: (items: readonly T[]) => Effect.Effect<void, E, R>;
    keyOf: (item: T) => number;
    format?: (key: number) => string;
  }) =>
  (page: Chunk.Chunk<T>): Effect.Effect<void, E, R> =>
    Effect.gen(function* () {
      const items = Chunk.toReadonlyArray(page);
      if (items.length === 0) {
        return;
      }
      yield* options.write(items);
      advance(options.cursor, (options.format ?? formatKey)(Math.max(...items.map(options.keyOf))));
    });

/** Which end of the [start, end) range a sync walk begins from. */
export type SyncDirection = 'forward' | 'backward';

/** A resolved sync range plus the direction its provider should walk it. */
export type SyncWindow = {
  readonly direction: SyncDirection;
  /** Inclusive-ish lower (oldest) bound. */
  readonly start: Date;
  /** Exclusive upper (newest) bound. */
  readonly end: Date;
};

export type ResolveSyncWindowOptions = {
  /** High-water cursor key (epoch-ms), or 0 when the source hasn't synced yet. */
  readonly cursorKey: number;
  /** Reference "now" (injected for testability). */
  readonly now: Date;
  /** Oldest bound (the horizon) — epoch-ms or a `Date`-parseable string. */
  readonly after?: string | number;
  /** Newest bound — epoch-ms or a `Date`-parseable string. Backfill passes the oldest-synced date. */
  readonly before?: string | number;
  /** Override the walk direction; otherwise inferred from the cursor. */
  readonly direction?: SyncDirection;
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
export const resolveSyncWindow = ({
  cursorKey,
  now,
  after,
  before,
  direction,
  syncBackDays,
  defaultSyncBackDays = 30, // TODO(burdon): Should be 90
}: ResolveSyncWindowOptions): SyncWindow => {
  const resolved: SyncDirection = direction ?? (cursorKey > 0 ? 'forward' : 'backward');
  const horizon =
    syncBackDays !== undefined
      ? addCalendarDays(now, -syncBackDays)
      : after !== undefined
        ? new Date(after)
        : addCalendarDays(now, -defaultSyncBackDays);
  const end = before !== undefined ? new Date(before) : addCalendarDays(now, 1);
  // Forward resumes from the cursor (else the horizon); backward covers the whole [horizon, end).
  const start = resolved === 'forward' && cursorKey > 0 ? new Date(cursorKey) : horizon;
  return { direction: resolved, start, end };
};
