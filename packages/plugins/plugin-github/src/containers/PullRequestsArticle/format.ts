//
// Copyright 2026 DXOS.org
//

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60_000],
  ['month', 30 * 24 * 60 * 60_000],
  ['week', 7 * 24 * 60 * 60_000],
  ['day', 24 * 60 * 60_000],
  ['hour', 60 * 60_000],
  ['minute', 60_000],
];

// Built once: constructing an `Intl` formatter resolves the locale each time, and every row formats.
let formatter: Intl.RelativeTimeFormat | undefined;

/** `5 minutes ago`, `yesterday`, `3 weeks ago` — in the largest unit that fits; empty for an invalid date. */
export const formatRelative = (value: string, now = Date.now()): string => {
  const date = Date.parse(value);
  if (Number.isNaN(date)) {
    return '';
  }
  formatter ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const elapsed = date - now;
  for (const [unit, size] of UNITS) {
    if (Math.abs(elapsed) >= size) {
      return formatter.format(Math.round(elapsed / size), unit);
    }
  }
  return formatter.format(0, 'minute');
};
