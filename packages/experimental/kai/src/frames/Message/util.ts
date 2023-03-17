//
// Copyright 2023 DXOS.org
//

import { format, formatDistance, isToday, isThisWeek } from 'date-fns';

import { Message } from '@dxos/kai-types';

// https://date-fns.org/v2.29.3/docs/format

export const formatDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : formatDistance(date, now, { addSuffix: true });

export const formatShortDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : isThisWeek(date) ? format(date, 'EEEE') : format(date, 'MMM d');

// TODO(burdon): Generalize.
export const sortMessage = ({ date: a }: Message, { date: b }: Message) => (a < b ? 1 : a > b ? -1 : 0);

/**
 * Hacky heuristic to guess company name.
 */
// TODO(burdon): Parse email body.
export const getCompanyName = (email: string): string | undefined => {
  const blacklist = ['aol', 'google', 'hotmail', 'yahoo'];
  const parts = email.split(/[@.]/);
  const employer = parts[1];
  if (blacklist.find((domain) => domain === employer)) {
    return;
  }

  return employer;
};
