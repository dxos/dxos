//
// Copyright 2025 DXOS.org
//

import { type Day, differenceInCalendarDays } from 'date-fns';

export const getDate = (start: Date, weekNumber: number, dayOfWeek: number, weekStartsOn: Day): Date => {
  const result = new Date(start);
  const startDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn; // Adjust for weekStartsOn.
  result.setDate(start.getDate() - adjustedStartDay + weekNumber * 7 + dayOfWeek);
  return result;
};

/**
 * Inverse of {@link getDate}: returns the row index for a given date, matching
 * the grid layout (which respects `weekStartsOn`).
 *
 * Uses `differenceInCalendarDays` (DST-safe) — naive ms subtraction silently
 * loses an hour each DST transition, which accumulates over decades and
 * eventually shifts the row boundary by one day. `differenceInWeeks` is also
 * unsuitable because it computes raw 7-day chunks anchored at the start
 * date's weekday rather than the grid's `weekStartsOn` column.
 */
export const getRowIndex = (start: Date, date: Date, weekStartsOn: Day): number => {
  const startDayOfWeek = start.getDay();
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn;
  const row0Start = new Date(start);
  row0Start.setDate(start.getDate() - adjustedStartDay);
  return Math.floor(differenceInCalendarDays(date, row0Start) / 7);
};

export const isSameDay = (date1: Date, date2: Date | undefined): boolean => {
  return (
    !!date2 &&
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
