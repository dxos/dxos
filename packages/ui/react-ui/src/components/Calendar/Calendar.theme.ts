//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type CalendarStyleProps = Partial<{}>;

//
// Theme slots target react-aria-components elements. RAC attaches `data-*` attributes to its
// rendered nodes (`data-selected`, `data-focused`, `data-disabled`, `data-outside-month`,
// `data-selection-start`, `data-selection-end`, `data-hovered`, etc.) which we hook into via
// Tailwind's `data-[…]:` modifiers.
//

const root: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('relative w-fit h-fit self-start p-2 select-none bg-group-surface text-base-foreground', ...etc);

const nav: ComponentFunction<CalendarStyleProps> = (_p, ...etc) => mx('flex items-center justify-between pb-1', ...etc);

const caption_label: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('flex-1 text-center text-sm font-medium', ...etc);

const button_previous: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx(
    'h-7 w-7 inline-flex items-center justify-center rounded-sm shrink-0',
    'text-description hover:bg-hover-surface',
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
    ...etc,
  );

const button_next: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx(
    'h-7 w-7 inline-flex items-center justify-center rounded-sm shrink-0',
    'text-description hover:bg-hover-surface',
    'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
    ...etc,
  );

const month_grid: ComponentFunction<CalendarStyleProps> = (_p, ...etc) => mx('w-full border-collapse', ...etc);

const weekdays: ComponentFunction<CalendarStyleProps> = (_p, ...etc) => mx('', ...etc);

const weekday: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx('w-9 h-7 text-xs font-thin text-description', ...etc);

const day: ComponentFunction<CalendarStyleProps> = (_p, ...etc) =>
  mx(
    'relative w-9 h-9 p-0 text-center text-sm rounded-sm inline-flex items-center justify-center cursor-pointer',
    'outline-none',
    'data-[hovered]:bg-hover-surface',
    'data-[focus-visible]:outline-2 data-[focus-visible]:outline-primary-500',
    'data-[selected]:bg-primary-500 data-[selected]:text-primary-fg data-[selected]:hover:bg-primary-500',
    'data-[outside-month]:text-description/40',
    'data-[disabled]:text-description/40 data-[disabled]:cursor-not-allowed data-[disabled]:hover:bg-transparent',
    'data-[unavailable]:line-through data-[unavailable]:text-description/50 data-[unavailable]:cursor-not-allowed',
    // Range selection visual layer.
    'data-[selection-start]:rounded-l-sm data-[selection-end]:rounded-r-sm',
    'data-[selection-start]:bg-primary-500 data-[selection-end]:bg-primary-500',
    ...etc,
  );

export const calendarTheme: Theme<CalendarStyleProps> = {
  root,
  nav,
  caption_label,
  button_previous,
  button_next,
  month_grid,
  weekdays,
  weekday,
  day,
};
