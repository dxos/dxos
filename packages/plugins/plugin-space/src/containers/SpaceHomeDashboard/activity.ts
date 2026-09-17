//
// Copyright 2026 DXOS.org
//

import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/** An hourly count: `Aggregate.updated('hour')` plus `Aggregate.count()`. */
export type HourCount = {
  readonly hour: number | null;
  readonly count: number;
};

/**
 * Sums UTC-hour counts into local calendar days, which is what the activity calendar draws.
 * A `null` hour (no timestamp recorded) has no day to land on and is dropped.
 */
export const toActivity = (rows: readonly HourCount[]): ActivityDatum[] => {
  const days = new Map<number, ActivityDatum>();
  for (const { hour, count } of rows) {
    if (hour === null) {
      continue;
    }
    const at = new Date(hour);
    const date = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const datum = days.get(date.getTime());
    if (datum) {
      datum.value += count;
    } else {
      days.set(date.getTime(), { date, value: count });
    }
  }
  return [...days.values()];
};
