//
// Copyright 2024 DXOS.org
//

import { format, formatDistance, isThisWeek, isToday } from 'date-fns';

// https://date-fns.org/v2.29.3/docs/format

export const formatDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : formatDistance(date, now, { addSuffix: true });

export const formatShortDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : isThisWeek(date) ? format(date, 'EEEE') : format(date, 'MMM d');

/**
 * Hashes a string into a number
 * @param str String to hash
 * @returns A non-negative number hash
 */
export const hashString = (str?: string): number => {
  if (!str) {
    return 0;
  }
  return Math.abs(str.split('').reduce((hash, char) => (hash << 5) + hash + char.charCodeAt(0), 0));
};
