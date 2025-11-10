/**
 * Default configurations for locale, theme, and display options.
 */

//
// Copyright 2025 DXOS.org
//

import { type CalendarLocale, type CalendarTheme, type DisplayOptions } from './types';

/**
 * Default locale configuration.
 */
export const defaultLocale: Required<CalendarLocale> = {
  blank: 'Select a date...',
  headerFormat: 'EEE, MMM do',
  todayLabel: {
    long: 'Today',
    short: 'Today',
  },
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weekStartsOn: 0,
  locale: undefined as any, // Will be overridden by date-fns default locale.
};

/**
 * Default theme configuration.
 */
export const defaultTheme: Required<CalendarTheme> = {
  floatingNav: {
    background: 'rgba(56, 87, 138, 0.94)',
    chevron: '#FFA726',
    color: '#FFF',
  },
  headerColor: '#448AFF',
  selectionColor: '#559FFF',
  textColor: {
    active: '#FFF',
    default: '#333',
  },
  todayColor: '#FFA726',
  weekdayColor: '#559FFF',
  overlayColor: 'rgba(255, 255, 255, 0.9)',
};

/**
 * Default display options.
 */
export const defaultDisplayOptions: Required<DisplayOptions> = {
  hideYearsOnSelect: true,
  layout: 'portrait',
  overscanMonthCount: 2,
  shouldHeaderAnimate: true,
  showHeader: true,
  showMonthsForYears: true,
  showOverlay: true,
  showTodayHelper: true,
  showWeekdays: true,
  todayHelperRowOffset: 4,
};

/**
 * Merge user-provided config with defaults.
 */
export const mergeLocale = (locale?: CalendarLocale): Required<CalendarLocale> => ({
  ...defaultLocale,
  ...locale,
  todayLabel: {
    ...defaultLocale.todayLabel,
    ...locale?.todayLabel,
  },
});

export const mergeTheme = (theme?: CalendarTheme): Required<CalendarTheme> => ({
  ...defaultTheme,
  ...theme,
  floatingNav: {
    ...defaultTheme.floatingNav,
    ...theme?.floatingNav,
  },
  textColor: {
    ...defaultTheme.textColor,
    ...theme?.textColor,
  },
});

export const mergeDisplayOptions = (displayOptions?: DisplayOptions): Required<DisplayOptions> => ({
  ...defaultDisplayOptions,
  ...displayOptions,
});
