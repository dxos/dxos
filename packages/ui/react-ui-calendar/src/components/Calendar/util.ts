//
// Copyright 2025 DXOS.org
//

import { type Day, differenceInCalendarDays, startOfDay } from 'date-fns';

/**
 * Fixed origin (row 0, column 0 anchor) for the infinite month grid. All row-index math is relative
 * to this epoch, so any view that reports a row index to the shared context must use the same value.
 */
export const gridEpoch = new Date('1970-01-01');

export const getDate = (start: Date, weekNumber: number, dayOfWeek: number, weekStartsOn: Day): Date => {
  const result = new Date(start);
  const startDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn; // Adjust for weekStartsOn.
  result.setDate(start.getDate() - adjustedStartDay + weekNumber * 7 + dayOfWeek);
  return result;
};

/**
 * Inverse of {@link getDate}: returns the row index for a given date, matching
 * the grid layout (which respects `weekStartsOn`).
 *
 * Uses `differenceInCalendarDays` (DST-safe) — naive ms subtraction silently
 * loses an hour each DST transition, which accumulates over decades and
 * eventually shifts the row boundary by one day. `differenceInWeeks` is also
 * unsuitable because it computes raw 7-day chunks anchored at the start
 * date's weekday rather than the grid's `weekStartsOn` column.
 */
export const getRowIndex = (start: Date, date: Date, weekStartsOn: Day): number => {
  const startDayOfWeek = start.getDay();
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn;
  const row0Start = new Date(start);
  row0Start.setDate(start.getDate() - adjustedStartDay);
  return Math.floor(differenceInCalendarDays(date, row0Start) / 7);
};

export const isSameDay = (date1: Date, date2: Date | undefined): boolean => {
  return (
    !!date2 &&
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

//
// Time-grid (week view) helpers.
//

export const MINUTES_PER_DAY = 24 * 60;

/** Default snap granularity for create/move/resize gestures, in minutes. */
export const SNAP_MINUTES = 15;

/** Minutes elapsed since the start of `date`'s day (0 .. 1439). */
export const minutesOfDay = (date: Date): number => (date.getTime() - startOfDay(date).getTime()) / 60_000;

/** Return a new Date on the same calendar day as `date`, at `minutes` past midnight. */
export const setMinutesOfDay = (date: Date, minutes: number): Date =>
  new Date(startOfDay(date).getTime() + minutes * 60_000);

/** Convert a vertical offset (px from the top of the day column) into minutes past midnight. */
export const yToMinutes = (y: number, hourHeight: number): number => (y / hourHeight) * 60;

/** Convert minutes past midnight into a vertical offset (px from the top of the day column). */
export const minutesToY = (minutes: number, hourHeight: number): number => (minutes / 60) * hourHeight;

/** Round `minutes` to the nearest `step`, clamped to a single day. */
export const snapMinutes = (minutes: number, step: number = SNAP_MINUTES): number => {
  const snapped = Math.round(minutes / step) * step;
  return Math.max(0, Math.min(MINUTES_PER_DAY, snapped));
};

/**
 * Side-by-side layout slot for an overlapping-event cluster: the event occupies
 * `1 / columnCount` of the day column width, offset by `columnIndex` columns.
 */
export type EventLayout = { columnIndex: number; columnCount: number };

/**
 * Compute side-by-side columns for events within a single day. Events that overlap in
 * time (transitively) form a cluster and split the column width evenly; non-overlapping
 * events each get the full width. Input order is irrelevant; results are keyed by index
 * into `events`.
 */
export const layoutDayEvents = <T extends { start: Date; end: Date }>(events: T[]): Map<number, EventLayout> => {
  const layout = new Map<number, EventLayout>();
  // Preserve original indices so callers can map results back to their event list.
  const ordered = events
    .map((event, index) => ({ index, start: event.start.getTime(), end: event.end.getTime() }))
    .sort((a, b) => a.start - b.start);

  let cluster: { index: number; start: number; end: number }[] = [];
  let clusterMax = -Infinity;

  const flush = () => {
    if (cluster.length === 0) {
      return;
    }
    // Greedy column packing: place each event in the first column whose previous event has ended.
    const columnEnds: number[] = [];
    const assigned = cluster.map(({ index, start, end }) => {
      let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
      if (column === -1) {
        column = columnEnds.length;
      }
      columnEnds[column] = end;
      return { index, column };
    });
    const columnCount = columnEnds.length;
    for (const { index, column } of assigned) {
      layout.set(index, { columnIndex: column, columnCount });
    }
    cluster = [];
    clusterMax = -Infinity;
  };

  for (const entry of ordered) {
    if (cluster.length > 0 && entry.start >= clusterMax) {
      // No overlap with the running cluster — close it out before starting fresh.
      flush();
    }
    cluster.push(entry);
    clusterMax = Math.max(clusterMax, entry.end);
  }
  flush();

  return layout;
};
