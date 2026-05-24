//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type CalendarStyleProps = Partial<{}>;

// Slot names match react-day-picker v9 `ClassNames` keys.
// See https://daypicker.dev/api/type-aliases/ClassNames

const root: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  // `relative` anchors the absolutely-positioned `nav` to the calendar bounds; `w-fit` keeps the root from spanning its container.
  mx('relative w-fit p-2 select-none text-base-foreground', ...etc);

const months: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex flex-col sm:flex-row gap-2', ...etc);

const month: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex flex-col gap-2', ...etc);

const month_caption: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex justify-center items-center h-8 relative', ...etc);

const caption_label: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('text-sm font-medium', ...etc);

const nav: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex items-center justify-between absolute inset-x-1 top-1', ...etc);

const button_previous: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx(
    'h-7 w-7 inline-flex items-center justify-center rounded-sm',
    'text-description hover:bg-hover-surface aria-disabled:opacity-50',
    ...etc,
  );

const button_next: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx(
    'h-7 w-7 inline-flex items-center justify-center rounded-sm',
    'text-description hover:bg-hover-surface aria-disabled:opacity-50',
    ...etc,
  );

const month_grid: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('w-full border-collapse', ...etc);

const weekdays: ComponentFunction<CalendarStyleProps> = (_p, ...etc) => mx('flex', ...etc);

const weekday: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('w-9 text-xs font-thin text-description', ...etc);

const week: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex w-full mt-1', ...etc);

const day: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('relative w-9 h-9 p-0 text-center text-sm', ...etc);

const day_button: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx(
    'inline-flex items-center justify-center w-9 h-9 rounded-sm',
    'hover:bg-hover-surface aria-disabled:opacity-50 aria-disabled:pointer-events-none',
    'focus-visible:outline-2 focus-visible:outline-primary-500',
    ...etc,
  );

const selected: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('[&_button]:bg-primary-500 [&_button]:text-primary-fg [&_button]:hover:bg-primary-500', ...etc);

const today: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('[&_button]:border [&_button]:border-amber-500', ...etc);

const outside: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('text-description/50', ...etc);

const disabled: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('text-description/40', ...etc);

const range_start: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('[&_button]:bg-primary-500 [&_button]:text-primary-fg rounded-l-sm', ...etc);

const range_middle: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('bg-primary-500/20 [&_button]:hover:bg-primary-500/30', ...etc);

const range_end: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('[&_button]:bg-primary-500 [&_button]:text-primary-fg rounded-r-sm', ...etc);

const hidden: ComponentFunction<CalendarStyleProps> = (_p, ...etc) => mx('invisible', ...etc);

const footer: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex justify-between items-center pt-2 mt-2 border-t border-separator', ...etc);

export const calendarTheme: Theme<CalendarStyleProps> = {
  root,
  months,
  month,
  month_caption,
  caption_label,
  nav,
  button_previous,
  button_next,
  month_grid,
  weekdays,
  weekday,
  week,
  day,
  day_button,
  selected,
  today,
  outside,
  disabled,
  range_start,
  range_middle,
  range_end,
  hidden,
  footer,
};
