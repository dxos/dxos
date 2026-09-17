//
// Copyright 2026 DXOS.org
//

import { Aggregate, Feed, Filter, Query, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { type SpaceStats } from './types.ts';

const FEED_TYPENAME = Type.getTypename(Feed.Feed);

/** One row of {@link SPACE_STATS_QUERY}: how many live objects carry a given type URI. */
export type TypeCount = {
  readonly type: string | null;
  readonly count: number;
};

/**
 * Counts every live object in a space by type. The host answers it from the meta index without
 * loading an object, so it is cheap enough to keep live.
 */
export const SPACE_STATS_QUERY = Query.select(Filter.everything()).aggregate({
  type: Aggregate.type(),
  count: Aggregate.count(),
});

/** The versionless typename a stored type URI names, or the URI itself when it is not a DXN. */
export const typenameOf = (type: string): string => {
  const dxn = DXN.tryMake(type);
  return dxn !== undefined ? DXN.getName(dxn) : type;
};

/**
 * Counts shown while nothing is running. Derived from a single "everything" query rather than one
 * query per statistic — a peripheral display is a glance, not a report.
 */
export const toSpaceStats = (rows: readonly TypeCount[], plugins: number): SpaceStats => ({
  objects: rows.reduce((total, row) => total + row.count, 0),
  feeds: rows
    .filter((row) => row.type !== null && typenameOf(row.type) === FEED_TYPENAME)
    .reduce((total, row) => total + row.count, 0),
  types: rows.filter((row) => row.type !== null).length,
  plugins,
});
