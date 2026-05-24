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

export type DateTimeRange = Range;

export type ValueFor<M extends DateTimePickerMode> =
  M extends 'date' ? Date :
  M extends 'date-time' ? Date :
  M extends 'date-range' ? DateTimeRange :
  M extends 'date-time-range' ? DateTimeRange :
  M extends 'time' ? Date :
  M extends 'time-range' ? DateTimeRange :
  never;

export type HourCycle = 'h12' | 'h23';

export type DateTimePickerRootProps<M extends DateTimePickerMode> = {
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
export const isTimeMode = (mode: DateTimePickerMode): boolean =>
  mode === 'date-time' || mode === 'date-time-range' || mode === 'time' || mode === 'time-range';

/** True for any mode whose value includes a date (day) component. */
export const isDateMode = (mode: DateTimePickerMode): boolean =>
  mode === 'date' || mode === 'date-time' || mode === 'date-range' || mode === 'date-time-range';

/** True for range modes. */
export const isRangeMode = (mode: DateTimePickerMode): boolean =>
  mode === 'date-range' || mode === 'date-time-range' || mode === 'time-range';
