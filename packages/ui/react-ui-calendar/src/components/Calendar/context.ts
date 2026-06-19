//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Day } from 'date-fns';
import { type Dispatch, type SetStateAction } from 'react';

import { type Event } from '@dxos/async';

//
// Range
//

/**
 * Inclusive date range. `from <= to`. Both endpoints are anchored at the
 * start of their day; callers should not rely on time-of-day precision.
 */
export type Range = {
  from: Date;
  to: Date;
};

//
// Controller
//

export type CalendarController = {
  /** Bring a date into view without changing the selection. */
  scrollTo: (date: Date) => void;
  /** Set the grid's selected day (and scroll it into view) — e.g. when the active event changes. */
  select: (date: Date) => void;
};

//
// Context
//

/** Imperative grid signal: `scroll` brings a date into view; `select` also sets it as the selected day. */
export type CalendarScrollEvent = {
  type: 'scroll' | 'select';
  date: Date;
};

export type CalendarContextValue = {
  weekStartsOn: Day;
  event: Event<CalendarScrollEvent>;
  index: number | undefined;
  setIndex: Dispatch<SetStateAction<number | undefined>>;
  selected: Date | undefined;
  setSelected: Dispatch<SetStateAction<Date | undefined>>;
  /** Committed date range, set by the most recent drag or shift+arrow selection. */
  range: Range | undefined;
  setRange: Dispatch<SetStateAction<Range | undefined>>;
  /** Live drag preview; non-undefined only while the user is dragging. */
  pendingRange: Range | undefined;
  setPendingRange: Dispatch<SetStateAction<Range | undefined>>;
};

export const [CalendarContextProvider, useCalendarContext] = createContext<CalendarContextValue>('Calendar');
