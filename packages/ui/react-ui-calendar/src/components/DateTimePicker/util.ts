//
// Copyright 2026 DXOS.org
//

import { startOfDay } from 'date-fns';

import { type DateTimePickerMode, type DateTimeRange, type ValueFor, isRangeMode, isTimeMode } from './types';

/** Normalize an unordered range so `from <= to`. Always returns a shallow copy; never the input reference. */
export const normalizeRange = (range: DateTimeRange): DateTimeRange =>
  range.from.getTime() <= range.to.getTime() ? { from: range.from, to: range.to } : { from: range.to, to: range.from };

/** Replace the date portion (year/month/day) of `target` with `source`'s date, preserving target's time. */
export const withDate = (target: Date, source: Date): Date => {
  const result = new Date(target);
  result.setFullYear(source.getFullYear(), source.getMonth(), source.getDate());
  return result;
};

/** Replace the time portion of `target` with `hours`/`minutes`, preserving target's date. */
export const withTime = (target: Date, hours: number, minutes: number): Date => {
  const result = new Date(target);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

/** Coerce an inbound value to the canonical shape for `mode` (zero time for date-only, normalize ranges). */
export const coerceValue = <M extends DateTimePickerMode>(mode: M, value: ValueFor<M>): ValueFor<M> => {
  if (isRangeMode(mode)) {
    const range = value as DateTimeRange;
    const normalized = normalizeRange(range);
    if (!isTimeMode(mode)) {
      return { from: startOfDay(normalized.from), to: startOfDay(normalized.to) } as ValueFor<M>;
    }
    return normalized as ValueFor<M>;
  }
  const date = value as Date;
  if (!isTimeMode(mode)) {
    return startOfDay(date) as ValueFor<M>;
  }
  return date as ValueFor<M>;
};

/** Sensible empty default for `mode` (used by uncontrolled Root when neither `value` nor `defaultValue` is given). */
export const defaultValueFor = <M extends DateTimePickerMode>(mode: M): ValueFor<M> => {
  const now = new Date();
  if (isRangeMode(mode)) {
    const start = isTimeMode(mode) ? now : startOfDay(now);
    return { from: start, to: new Date(start) } as ValueFor<M>;
  }
  return (isTimeMode(mode) ? now : startOfDay(now)) as ValueFor<M>;
};
