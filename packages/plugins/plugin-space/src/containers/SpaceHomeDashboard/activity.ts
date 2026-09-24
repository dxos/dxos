//
// Copyright 2026 DXOS.org
//

import { Aggregate, Filter, Query } from '@dxos/echo';
import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/**
 * Counts changes per UTC hour; {@link toActivity} rolls the hours into the viewer's days. Deleted
 * objects keep their hours, and every edit counts, not just the last one.
 */
export const HOURLY_ACTIVITY_QUERY = Query.select(Filter.changes()).aggregate({
  hour: Aggregate.time('time', 'hour'),
  count: Aggregate.count(),
});

/** A row of {@link HOURLY_ACTIVITY_QUERY}. */
export type HourCount = {
  readonly hour: number | null;
  readonly count: number;
};

/**
 * One calendar entry per local day, in the runtime's time zone. In a zone offset by a fraction of an
 * hour (India, Newfoundland) the hour straddling midnight lands wholly on the day it starts in.
 */
export const toActivity = (rows: readonly HourCount[]): ActivityDatum[] => {
  const days = new Map<number, number>();
  for (const { hour, count } of rows) {
    if (hour === null) {
      continue;
    }
    const date = new Date(hour);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    days.set(day, (days.get(day) ?? 0) + count);
  }
  return [...days].sort(([a], [b]) => a - b).map(([day, value]) => ({ date: new Date(day), value }));
};
