//
// Copyright 2025 DXOS.org
//

import { type Day, startOfDay } from 'date-fns';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export const getDate = (start: Date, weekNumber: number, dayOfWeek: number, weekStartsOn: Day): Date => {
  const result = new Date(start);
  const startDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn; // Adjust for weekStartsOn.
  result.setDate(start.getDate() - adjustedStartDay + weekNumber * 7 + dayOfWeek);
  return result;
};

/**
 * Inverse of {@link getDate}: returns the row index for a given date, matching
 * the grid layout (which respects `weekStartsOn`). NOTE: `differenceInWeeks`
 * from date-fns uses raw 7-day chunks anchored at the start date's weekday,
 * which does NOT match the grid's row breakdown when `start` and the target
 * fall on different weekdays — use this helper instead.
 */
export const getRowIndex = (start: Date, date: Date, weekStartsOn: Day): number => {
  const startDayOfWeek = start.getDay();
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn;
  const row0Start = startOfDay(start).getTime() - adjustedStartDay * MS_PER_DAY;
  return Math.floor((startOfDay(date).getTime() - row0Start) / MS_PER_WEEK);
};

export const isSameDay = (date1: Date, date2: Date | undefined): boolean => {
  return (
    !!date2 &&
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
