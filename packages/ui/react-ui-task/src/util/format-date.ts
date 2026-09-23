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
