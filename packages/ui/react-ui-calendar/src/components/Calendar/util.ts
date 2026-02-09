//
// Copyright 2025 DXOS.org
//

import { type Day } from 'date-fns';

export const getDate = (start: Date, weekNumber: number, dayOfWeek: number, weekStartsOn: Day): Date => {
  const result = new Date(start);
  const startDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn; // Adjust for weekStartsOn.
  result.setDate(start.getDate() - adjustedStartDay + weekNumber * 7 + dayOfWeek);
  return result;
};

export const isSameDay = (date1: Date, date2: Date | undefined): boolean => {
  return (
    !!date2 &&
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
