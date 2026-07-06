//
// Copyright 2026 DXOS.org
//

import { addDays, subDays } from 'date-fns';

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
  /** High-water cursor key (epoch-ms), or 0 when the mailbox hasn't synced yet. */
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

/**
 * Resolves the range and direction a mailbox sync should cover, shared across providers so their
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
  defaultSyncBackDays = 30,
}: ResolveSyncWindowOptions): SyncWindow => {
  const resolved: SyncDirection = direction ?? (cursorKey > 0 ? 'forward' : 'backward');
  const horizon =
    syncBackDays !== undefined
      ? subDays(now, syncBackDays)
      : after !== undefined
        ? new Date(after)
        : subDays(now, defaultSyncBackDays);
  const end = before !== undefined ? new Date(before) : addDays(now, 1);
  // Forward resumes from the cursor (else the horizon); backward covers the whole [horizon, end).
  const start = resolved === 'forward' && cursorKey > 0 ? new Date(cursorKey) : horizon;
  return { direction: resolved, start, end };
};
