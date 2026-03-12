//
// Copyright 2025 DXOS.org
//

import { type Locale } from 'date-fns';
import { type RefObject } from 'react';

/**
 * Calendar types and interfaces.
 */

export type DateString = string; // YYYY-MM-DD format

export type DisplayMode = 'days' | 'years';

export type LayoutMode = 'portrait' | 'landscape';

/**
 * Locale configuration for the calendar.
 */
export interface CalendarLocale {
  blank?: string;
  headerFormat?: string;
  todayLabel?: {
    long: string;
    short?: string;
  };
  weekdays?: string[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  locale?: Locale; // date-fns locale
}

/**
 * Theme configuration for the calendar.
 */
export interface CalendarTheme {
  floatingNav?: {
    background?: string;
    chevron?: string;
    color?: string;
  };
  headerColor?: string;
  selectionColor?: string | ((date: DateString) => string);
  textColor?: {
    active?: string;
    default?: string;
  };
  todayColor?: string;
  weekdayColor?: string;
  overlayColor?: string;
}

/**
 * Display options for the calendar.
 */
export interface DisplayOptions {
  hideYearsOnSelect?: boolean;
  layout?: LayoutMode;
  overscanMonthCount?: number;
  shouldHeaderAnimate?: boolean;
  showHeader?: boolean;
  showMonthsForYears?: boolean;
  showOverlay?: boolean;
  showTodayHelper?: boolean;
  showWeekdays?: boolean;
  todayHelperRowOffset?: number;
}

/**
 * Month data structure.
 */
export interface MonthData {
  month: number;
  year: number;
}

/**
 * Month rendering data.
 */
export interface MonthRenderData {
  date: Date;
  rows: number[][];
}

/**
 * Day props for rendering.
 */
export interface DayProps {
  date: DateString;
  day: number;
  month: number;
  year: number;
  monthShort: string;
  currentYear: number;
  isDisabled: boolean;
  isToday: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  onClick?: (date: Date) => void;
  handlers?: Record<string, any>;
  className?: string;
}

/**
 * Calendar props.
 */
export interface CalendarProps {
  autoFocus?: boolean;
  className?: string;
  disabledDates?: Date[];
  disabledDays?: number[];
  display?: DisplayMode;
  displayOptions?: DisplayOptions;
  height?: number;
  keyboardSupport?: boolean;
  locale?: CalendarLocale;
  max?: Date;
  maxDate?: Date;
  min?: Date;
  minDate?: Date;
  onScroll?: (scrollTop: number, event?: Event) => void;
  onScrollEnd?: (scrollTop: number) => void;
  onSelect?: (date: Date) => void;
  onHighlightedDateChange?: (date: Date) => void;
  rowHeight?: number;
  scrollDate?: Date;
  selected?: Date | DateString;
  tabIndex?: number;
  theme?: CalendarTheme;
  width?: number | string;
}

/**
 * Month props.
 */
export interface MonthProps {
  monthDate: Date;
  rows: number[][];
  rowHeight: number;
  selected?: DateString;
  disabledDates?: DateString[];
  disabledDays?: number[];
  minDate: Date;
  maxDate: Date;
  today: Date;
  locale: Required<CalendarLocale>;
  theme: Required<CalendarTheme>;
  showOverlay?: boolean;
  isScrolling?: boolean;
  onDayClick?: (date: Date) => void;
}

/**
 * Hook return types for headless implementation.
 */
export interface UseCalendarReturn {
  containerProps: {
    ref: RefObject<HTMLDivElement>;
    tabIndex?: number;
    className?: string;
    'aria-label': string;
  };
  display: DisplayMode;
  locale: Required<CalendarLocale>;
  theme: Required<CalendarTheme>;
  displayOptions: Required<DisplayOptions>;
  months: MonthData[];
  today: Date;
  scrollToDate: (date: Date, offset?: number, shouldAnimate?: boolean) => void;
  scrollTo: (offset: number) => void;
  getCurrentOffset: () => number;
  getDateOffset: (date: Date) => number;
  setDisplay: (display: DisplayMode) => void;
}

export interface UseDayReturn {
  dayProps: {
    onClick: () => void;
    'data-date': DateString;
    className?: string;
  };
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isHighlighted: boolean;
  selectionColor?: string;
}

export interface UseMonthReturn {
  days: DayProps[];
  monthLabel: string;
  showOverlay: boolean;
}
