//
// Copyright 2026 DXOS.org
//

import { useCallback, useRef, useState } from 'react';

/** Movement below this is sub-pixel rounding, not a row changing place. */
const EPSILON = 1;

export type PositionStats = {
  /** Rows whose offset changed after they were laid out — every one of these is a visible flicker. */
  shifts: number;
  /** Windows where offsets did not increase with index; a row was placed over its neighbour. */
  breaks: number;
  /** The most recent shift, for reading in the console while scrolling. */
  last?: { index: number; from: number; to: number };
};

/** `key` is the virtualizer's item key — the message id, via `getItemKey`. */
export type PositionKey = number | string | bigint;

export type PositionEntry = { key: PositionKey; index: number; start: number };

const EMPTY: PositionStats = { shifts: 0, breaks: 0 };

/**
 * Records where each row was placed, and reports when a row moves.
 *
 * A virtualized list is only still if a row's offset, once laid out, does not change: rows above the
 * reader are measured as they mount, and any correction there pushes everything below it. Scrolling
 * **up** is where this shows, because that is the direction in which unmeasured rows enter — going
 * down, the rows above have already been measured.
 *
 * Two invariants, both checked against the offsets the virtualizer publishes rather than the DOM, so
 * a violation is attributed to the layout rather than to paint:
 *
 * 1. a row keyed by message id keeps its offset for as long as it stays mounted;
 * 2. offsets within the mounted window increase strictly with index.
 *
 * The count is what a reader means by "flicker". Deliberately kept as a count rather than a log:
 * a scroll produces thousands of samples, and the number is the signal.
 */
export const usePositionLog = () => {
  const positions = useRef(new Map<PositionKey, number>());
  const [stats, setStats] = useState<PositionStats>(EMPTY);
  const pending = useRef<PositionStats>(EMPTY);

  const reset = useCallback(() => {
    positions.current.clear();
    pending.current = EMPTY;
    setStats(EMPTY);
  }, []);

  const record = useCallback((entries: readonly PositionEntry[]) => {
    let { shifts, breaks, last } = pending.current;

    let previousStart = -Infinity;
    for (const { key, index, start } of entries) {
      const recorded = positions.current.get(key);
      if (recorded !== undefined && Math.abs(recorded - start) > EPSILON) {
        shifts++;
        last = { index, from: Math.round(recorded), to: Math.round(start) };
      }

      positions.current.set(key, start);
      if (start < previousStart) {
        breaks++;
      }
      previousStart = start;
    }

    // Rows that are no longer mounted are forgotten: their next measurement is a fresh layout, and
    // holding the old offset would report every remount as a shift.
    const mounted = new Set(entries.map(({ key }) => key));
    for (const key of positions.current.keys()) {
      if (!mounted.has(key)) {
        positions.current.delete(key);
      }
    }

    const next = { shifts, breaks, last };
    pending.current = next;
    setStats((previous) =>
      previous.shifts === next.shifts && previous.breaks === next.breaks ? previous : { ...next },
    );
  }, []);

  return { ...stats, record, reset };
};
