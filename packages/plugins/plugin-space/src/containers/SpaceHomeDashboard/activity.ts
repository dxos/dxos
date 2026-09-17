//
// Copyright 2026 DXOS.org
//

import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/** A daily count: `Aggregate.updated('day', { timeZone })` plus `Aggregate.count()`. */
export type DayCount = {
  readonly day: number | null;
  readonly count: number;
};

/**
 * Sums counts that share a day into one calendar entry; rows arrive per type as well as per day.
 * A `null` day (no timestamp recorded) has no square to land on and is dropped.
 */
export const toActivity = (rows: readonly DayCount[]): ActivityDatum[] => {
  const days = new Map<number, ActivityDatum>();
  for (const { day, count } of rows) {
    if (day === null) {
      continue;
    }
    const datum = days.get(day);
    if (datum) {
      datum.value += count;
    } else {
      days.set(day, { date: new Date(day), value: count });
    }
  }
  return [...days.values()];
};
