//
// Copyright 2026 DXOS.org
//

import { formatDistanceStrict } from 'date-fns';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Relative within the last day ("5 minutes ago"), where elapsed time places it; the date and time beyond. */
export const formatTime = (created: string, now: number): string => {
  const date = new Date(created);
  return now - date.getTime() < DAY_MS
    ? formatDistanceStrict(date, now, { addSuffix: true })
    : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
};
