//
// Copyright 2026 DXOS.org
//

import { differenceInCalendarDays, formatDistance } from 'date-fns';

/** Beyond this, "x days ago" stops locating an event and the calendar date does it better. */
export const RELATIVE_DAYS = 3;

export type FormatRelativeOptions = {
  /** Days before the date is shown as a calendar date rather than a distance. */
  relativeDays?: number;
  /** The instant to measure against; supplied by a test so the result does not move with the clock. */
  now?: Date;
};

/**
 * A timestamp as a reader scans it: recent activity as a distance ("2 hours ago"), older activity as
 * a local calendar date.
 *
 * The date is formatted in the reader's own locale and zone (`toLocaleDateString`), since it is read
 * as "when did this happen to me" rather than as a record to cite; an unparseable value is returned
 * as it came, because a log line is decoration and never the source of truth.
 */
export const formatRelative = (
  date: string | Date,
  { relativeDays = RELATIVE_DAYS, now }: FormatRelativeOptions = {},
): string => {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return typeof date === 'string' ? date : '';
  }

  // One instant for both halves, so the cut-off and the distance cannot disagree about when "now"
  // is — which is also what makes the boundary testable without the wall clock.
  const reference = now ?? new Date();
  // Calendar days, not elapsed hours: yesterday evening reads as "1 day", not "20 hours", which is
  // what makes the cut-off land on the same boundary a reader would draw.
  const days = Math.abs(differenceInCalendarDays(reference, parsed));
  return days > relativeDays
    ? parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : formatDistance(parsed, reference, { addSuffix: true });
};

/** Beyond two hours a minute count stops being read as a count and starts being arithmetic. */
const COMPACT_MINUTES = 120;

/** Beyond a day, hours are a number the reader has to divide; the calendar date says it directly. */
const COMPACT_HOURS = 24;

export type FormatCompactOptions = Pick<FormatRelativeOptions, 'now'>;

/**
 * A timestamp in the space a column has: `12m`, `90m`, `5h`, then `12 Sep`.
 *
 * Minutes run to two hours rather than to one, because `90m` is still a duration a reader feels
 * while `1.5h` is one they compute; hours run to a day, after which the calendar date locates the
 * event better than any count of hours. The full timestamp belongs in a tooltip beside this, since
 * everything here is lossy by design.
 *
 * Returns the empty string for an unparseable value: a compact cell has no room to explain itself,
 * and the tooltip carries the original for anyone who needs it.
 */
export const formatCompact = (date: string | Date, { now }: FormatCompactOptions = {}): string => {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const reference = now ?? new Date();
  const minutes = Math.floor((reference.getTime() - parsed.getTime()) / 60_000);
  // A date in the future is a clock skew or a seeded fixture, not a duration to count down.
  if (minutes < 0) {
    return formatCompactDate(parsed, reference);
  }
  if (minutes < 1) {
    return 'now';
  }
  if (minutes < COMPACT_MINUTES) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < COMPACT_HOURS) {
    return `${hours}h`;
  }

  return formatCompactDate(parsed, reference);
};

/** The day, and the year only when it is not this one — a column has no room for what is implied. */
const formatCompactDate = (date: Date, reference: Date): string =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== reference.getFullYear() && { year: 'numeric' }),
  });

/**
 * How long until the compact form of this timestamp changes, in milliseconds, or `undefined` when it
 * never will again.
 *
 * A live counter that ticks on a fixed interval either lags (a minute counter on a five-minute
 * timer) or wakes for nothing (a day-old entry on a one-second timer); asking the value when it next
 * changes is the only cadence that is both exact and idle when it can be.
 */
export const compactInterval = (date: string | Date, { now }: FormatCompactOptions = {}): number | undefined => {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const elapsed = (now ?? new Date()).getTime() - parsed.getTime();
  if (elapsed < 0) {
    return undefined;
  }

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < COMPACT_MINUTES) {
    // The next whole minute: what is left of the current one.
    return 60_000 - (elapsed % 60_000);
  }
  if (minutes < COMPACT_MINUTES * (COMPACT_HOURS / 2)) {
    return 3_600_000 - (elapsed % 3_600_000);
  }

  // A calendar date: it changes at midnight, which no counter here is watching.
  return undefined;
};
