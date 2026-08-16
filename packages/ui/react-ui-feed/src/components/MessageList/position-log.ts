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
  last?: PositionShift;
};

export type PositionShift = { index: number; from: number; to: number; delta: number };

/** Recent shifts kept for inspection — enough to see whether one row type moves or all of them. */
const TRACE_LIMIT = 40;

/** `key` is the virtualizer's item key — the message id, via `getItemKey`. */
export type PositionKey = number | string | bigint;

export type PositionEntry = { key: PositionKey; index: number; start: number };

/** Movement of the viewport itself between samples, which every row is expected to follow. */
export type PositionFrame = { scrollOffset: number };

const EMPTY: PositionStats = { shifts: 0, breaks: 0 };

/**
 * Records where each row was placed, and reports when a row moves.
 *
 * A virtualized list is only still if a row's offset, once laid out, does not change: rows above the
 * reader are measured as they mount, and any correction there pushes everything below it. Scrolling
 * **up** is where this shows, because that is the direction in which unmeasured rows enter — going
 * down, the rows above have already been measured.
 *
 * Positions are recorded **relative to the viewport** (`start - scrollOffset`), not as absolute
 * document offsets, because those two answer different questions. Measuring a row for the first time
 * re-lays every row below it, and the virtualizer compensates by moving `scrollTop` the same
 * distance — the offsets all change and the reader sees nothing. What a reader sees is a row landing
 * somewhere else on screen, which is what this counts.
 *
 * Two invariants:
 *
 * 1. a row keyed by message id holds its place on screen for as long as it stays mounted;
 * 2. positions within the mounted window increase strictly with index.
 *
 * The count is what a reader means by "flicker". Deliberately kept as a count rather than a log:
 * a scroll produces thousands of samples, and the number is the signal.
 */
export const usePositionLog = () => {
  const positions = useRef(new Map<PositionKey, number>());
  const trace = useRef<PositionShift[]>([]);
  const [stats, setStats] = useState<PositionStats>(EMPTY);
  const pending = useRef<PositionStats>(EMPTY);

  const reset = useCallback(() => {
    positions.current.clear();
    trace.current = [];
    pending.current = EMPTY;
    setStats(EMPTY);
  }, []);

  const record = useCallback((entries: readonly PositionEntry[], { scrollOffset }: PositionFrame) => {
    let { shifts, breaks, last } = pending.current;

    let previousStart = -Infinity;
    for (const { key, index, start: absolute } of entries) {
      const start = absolute - scrollOffset;
      const recorded = positions.current.get(key);
      if (recorded !== undefined && Math.abs(recorded - start) > EPSILON) {
        shifts++;
        last = { index, from: Math.round(recorded), to: Math.round(start), delta: Math.round(start - recorded) };
        trace.current.push(last);
        if (trace.current.length > TRACE_LIMIT) {
          trace.current.shift();
        }
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

  return { ...stats, trace, record, reset };
};
