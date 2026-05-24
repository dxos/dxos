//
// Copyright 2026 DXOS.org
//

import { type Day } from 'date-fns';

import { type Range } from '../Calendar/Calendar';

export type DateTimePickerMode =
  | 'date'
  | 'date-time'
  | 'date-range'
  | 'date-time-range'
  | 'time'
  | 'time-range';

/**
 * Inclusive date range used by range picker modes.
 * In `date-range` mode, both endpoints are anchored at midnight.
 * In `date-time-range` and `time-range` modes, the time component is significant.
 * Structurally identical to `Calendar.Range` for `Calendar.Grid` interop.
 */
export type DateTimeRange = Range;

export type ValueFor<M extends DateTimePickerMode> = M extends 'date-range' | 'date-time-range' | 'time-range'
  ? DateTimeRange
  : Date;

/**
 * Simplified hour cycle. `Intl` can also return `h11`/`h24`; we treat those as
 * equivalent to `h12`/`h23` respectively. See `resolveHourCycle` in `segments.ts`.
 */
export type HourCycle = 'h12' | 'h23';

export type DateTimePickerRootProps<M extends DateTimePickerMode = DateTimePickerMode> = {
  mode: M;
  value?: ValueFor<M>;
  defaultValue?: ValueFor<M>;
  onValueChange?: (value: ValueFor<M>) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Minute granularity. Default 15. */
  step?: number;
  /** 12h or 24h. Default: derived from `locale`. */
  hourCycle?: HourCycle;
  /** BCP-47 locale tag. Default: `navigator.language`. */
  locale?: string;
  /** Forwarded to Calendar.Root. Default 1 (Monday). */
  weekStartsOn?: Day;
  disabled?: boolean;
};

/** True for any mode whose value includes a time-of-day component. */
export const isTimeMode = (
  mode: DateTimePickerMode,
): mode is 'date-time' | 'date-time-range' | 'time' | 'time-range' =>
  mode === 'date-time' || mode === 'date-time-range' || mode === 'time' || mode === 'time-range';

/** True for any mode whose value includes a date (day) component. */
export const isDateMode = (
  mode: DateTimePickerMode,
): mode is 'date' | 'date-time' | 'date-range' | 'date-time-range' =>
  mode === 'date' || mode === 'date-time' || mode === 'date-range' || mode === 'date-time-range';

/** True for range modes. */
export const isRangeMode = (
  mode: DateTimePickerMode,
): mode is 'date-range' | 'date-time-range' | 'time-range' =>
  mode === 'date-range' || mode === 'date-time-range' || mode === 'time-range';
