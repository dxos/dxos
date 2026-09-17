//
// Copyright 2026 DXOS.org
//

import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/** One row of the space activity ledger: changes counted in a UTC hour. */
export type HourlyChanges = {
  readonly hour: number;
  readonly changes: number;
};

const HOUR_MS = 3_600_000;

/**
 * Sums UTC-hour change counts into local calendar days, which is what the activity calendar draws.
 */
export const toActivity = (rows: readonly HourlyChanges[]): ActivityDatum[] => {
  const days = new Map<number, ActivityDatum>();
  for (const { hour, changes } of rows) {
    const at = new Date(hour * HOUR_MS);
    const date = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const datum = days.get(date.getTime());
    if (datum) {
      datum.value += changes;
    } else {
      days.set(date.getTime(), { date, value: changes });
    }
  }
  return [...days.values()];
};
