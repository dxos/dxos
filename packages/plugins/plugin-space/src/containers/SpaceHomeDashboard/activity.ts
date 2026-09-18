//
// Copyright 2026 DXOS.org
//

import { Aggregate, Filter, Query } from '@dxos/echo';
import { type ActivityDatum } from '@dxos/react-ui-dashboard';

/** Counts live objects by the local day in `timeZone` they were last updated; one row per day. */
export const dailyActivityQuery = (timeZone: string) =>
  Query.select(Filter.everything()).aggregate({
    day: Aggregate.updated('day', { timeZone }),
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
