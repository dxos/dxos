//
// Copyright 2026 DXOS.org
//

import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/** One row of an hour-bucketed count: `Aggregate.bucket('updatedAt')` plus `Aggregate.count()`. */
export type HourCount = {
  readonly hour: number | null;
  readonly count: number;
};

const HOUR_MS = 3_600_000;

/**
 * Sums UTC-hour counts into local calendar days, which is what the activity calendar draws.
 * A `null` hour (no timestamp recorded) has no day to land on and is dropped.
 */
export const toActivity = (...sources: readonly (readonly HourCount[])[]): ActivityDatum[] => {
  const days = new Map<number, ActivityDatum>();
  for (const rows of sources) {
    for (const { hour, count } of rows) {
      if (hour === null) {
        continue;
      }
      const at = new Date(hour * HOUR_MS);
      const date = new Date(at.getFullYear(), at.getMonth(), at.getDate());
      const datum = days.get(date.getTime());
      if (datum) {
        datum.value += count;
      } else {
        days.set(date.getTime(), { date, value: count });
      }
    }
  }
  return [...days.values()];
};
