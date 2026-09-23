//
// Copyright 2026 DXOS.org
//

import { Aggregate, Filter, Query } from '@dxos/echo';
import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/**
 * Counts Automerge changes by the local day in `timeZone` they were made; one row per day. Deleted
 * objects keep their days, and every edit counts, not just the last one.
 */
export const dailyActivityQuery = (timeZone: string) =>
  Query.select(Filter.changes()).aggregate({
    day: Aggregate.time('time', 'day', { timeZone }),
    count: Aggregate.count(),
  });

/** A row of {@link dailyActivityQuery}. */
export type DayCount = {
  readonly day: number | null;
  readonly count: number;
};

/** One calendar entry per day; a `null` day (no timestamp recorded) has no square and is dropped. */
export const toActivity = (rows: readonly DayCount[]): ActivityDatum[] =>
  rows.flatMap(({ day, count }) => (day === null ? [] : [{ date: new Date(day), value: count }]));
