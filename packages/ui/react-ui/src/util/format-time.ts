//
// Copyright 2026 DXOS.org
//

export type FormatCompactOptions = {
  /** The instant to measure against; supplied by a test so the result does not move with the clock. */
  now?: Date;
};

/** An instant as an ISO string, a Unix timestamp in milliseconds, or a Date. */
export type DateLike = string | number | Date;

/** Normalizes a {@link DateLike}; an unparseable value yields an invalid Date, which callers check. */
export const toDate = (date: DateLike): Date => (date instanceof Date ? date : new Date(date));

/** Beyond two hours a minute count stops being read as a count and starts being arithmetic. */
const COMPACT_MINUTES = 120;

/** Beyond a day, hours are a number the reader has to divide; the calendar date says it directly. */
const COMPACT_HOURS = 24;

/** `setTimeout` treats anything past this as zero, so a longer wait has to be capped, not requested. */
const MAX_TIMEOUT = 2_147_483_647;

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
export const formatCompact = (date: DateLike, { now }: FormatCompactOptions = {}): string => {
  const parsed = toDate(date);
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
const formatCompactDate = (date: Date, reference: Date, locale?: string): string =>
  date.toLocaleDateString(locale, {
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
export const compactInterval = (date: DateLike, { now }: FormatCompactOptions = {}): number | undefined => {
  const parsed = toDate(date);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const elapsed = (now ?? new Date()).getTime() - parsed.getTime();
  // A future instant shows a date until the clock catches up, and then becomes a counter: wake when
  // it does. Capped to the range a timer accepts — beyond ~24 days `setTimeout` fires immediately,
  // which would spin rather than wait.
  if (elapsed < 0) {
    return Math.min(-elapsed, MAX_TIMEOUT);
  }

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < COMPACT_MINUTES) {
    // The next whole minute: what is left of the current one.
    return 60_000 - (elapsed % 60_000);
  }
  // Up to the hour count's own limit, so the last hour before a timestamp becomes a date still ticks.
  if (minutes < COMPACT_HOURS * 60) {
    return 3_600_000 - (elapsed % 3_600_000);
  }

  // A calendar date: it changes at midnight, and nothing here is watching for that — a date label is
  // read as "when", not as a countdown, and a timer per row to catch a year boundary costs more than
  // the staleness it prevents.
  return undefined;
};

/** Within two days a reader places an event by elapsed time; beyond that, by its date. */
const RELATIVE_MS = 2 * 24 * 60 * 60_000;

export type FormatRelativeOptions = FormatCompactOptions & {
  /** Rendered for anything under a minute, translated by the caller; `Intl`'s "now" otherwise. */
  justNow?: string;
  /** BCP 47 locale, so the label reads in the app's language rather than the runtime's; the runtime's when absent. */
  locale?: string;
};

// One per locale: constructing an `Intl` formatter resolves the locale each time, and every row formats.
const relativeFormatters = new Map<string | undefined, Intl.RelativeTimeFormat>();
const relativeFormat = (locale: string | undefined): Intl.RelativeTimeFormat => {
  let formatter = relativeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    relativeFormatters.set(locale, formatter);
  }
  return formatter;
};

/**
 * A timestamp as prose: relative within two days (`now`, `5 minutes ago`, `3 hours ago`, `yesterday`), then the
 * calendar date (`12 Sep`, with the year only when it is not this one). The app's one rule for "when", so a thread, a
 * message and a notification read alike; an unparseable value yields the empty string.
 */
export const formatRelative = (date: DateLike, { now, justNow, locale }: FormatRelativeOptions = {}): string => {
  const parsed = toDate(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const reference = now ?? new Date();
  const elapsed = reference.getTime() - parsed.getTime();
  // A date in the future is a clock skew or a seeded fixture, not a duration to count down.
  if (elapsed < 0 || elapsed >= RELATIVE_MS) {
    return formatCompactDate(parsed, reference, locale);
  }

  const format = relativeFormat(locale);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) {
    return justNow ?? format.format(0, 'second');
  }
  if (minutes < 60) {
    return format.format(-minutes, 'minute');
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return format.format(-hours, 'hour');
  }

  // `numeric: 'auto'` renders -1 day as "yesterday".
  return format.format(-Math.floor(hours / 24), 'day');
};

/** How long until {@link formatRelative}'s text changes, in milliseconds, or `undefined` when it never will again. */
export const relativeInterval = (date: DateLike, { now }: FormatCompactOptions = {}): number | undefined => {
  const parsed = toDate(date);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const elapsed = (now ?? new Date()).getTime() - parsed.getTime();
  if (elapsed < 0) {
    return Math.min(-elapsed, MAX_TIMEOUT);
  }
  if (elapsed < 60 * 60_000) {
    return 60_000 - (elapsed % 60_000);
  }
  if (elapsed < RELATIVE_MS) {
    return 3_600_000 - (elapsed % 3_600_000);
  }

  return undefined;
};
