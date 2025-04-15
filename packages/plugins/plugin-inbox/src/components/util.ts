//
// Copyright 2023 DXOS.org
//

import { format, formatDistance, isToday, isThisWeek } from 'date-fns';

// https://date-fns.org/v2.29.3/docs/format

export const formatDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : formatDistance(date, now, { addSuffix: true });

export const formatShortDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : isThisWeek(date) ? format(date, 'EEEE') : format(date, 'MMM d');
