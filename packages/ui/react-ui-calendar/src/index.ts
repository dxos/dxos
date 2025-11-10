/**
 * @dxos/react-ui-calendar - Headless calendar components.
 */

// Types.
//
// Copyright 2025 DXOS.org
//

export type {
  CalendarLocale,
  CalendarProps,
  CalendarTheme,
  DateString,
  DayProps,
  DisplayMode,
  DisplayOptions,
  LayoutMode,
  MonthData,
  MonthProps,
  MonthRenderData,
  UseCalendarReturn,
  UseDayReturn,
  UseMonthReturn,
} from './types';

// Components.
export { HeadlessCalendar, useCalendar } from './components/Calendar';
export type { CalendarRenderProps, UseCalendarOptions } from './components/Calendar';

export { HeadlessDay, useDay } from './components/Day';
export type { DayRenderProps, HeadlessDayProps } from './components/Day';

export { HeadlessMonth, useMonth } from './components/Month';
export type { HeadlessMonthProps, MonthRenderProps } from './components/Month';

// Defaults.
export {
  defaultDisplayOptions,
  defaultLocale,
  defaultTheme,
  mergeDisplayOptions,
  mergeLocale,
  mergeTheme,
} from './defaults';

// Utilities.
export {
  animate,
  debounce,
  emptyFn,
  getDateOffset,
  getDateString,
  getMonth,
  getMonthsForYear,
  getWeek,
  getWeeksInMonth,
  keyCodes,
  range,
  sanitizeDate,
  ScrollSpeed,
} from './utils';
