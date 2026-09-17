//
// Copyright 2026 DXOS.org
//

import { Aggregate, Feed, Filter, Query, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { type SpaceStats } from './types.ts';

const FEED_TYPENAME = Type.getTypename(Feed.Feed);

/** How many live objects carry a given type URI. */
export type TypeCount = {
  readonly type: string | null;
  readonly count: number;
};

/**
 * Counts every live object in a space by type. The host answers from index rows and sends one row
 * per type, so no document is loaded.
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
  objects: countObjects(rows),
  feeds: countObjects(rows, FEED_TYPENAME),
  types: countTypenames(rows),
  plugins,
});

/** Live objects across `rows`, or only those of one versionless typename. */
export const countObjects = (rows: readonly TypeCount[], typename?: string): number =>
  rows
    .filter((row) => typename === undefined || (row.type !== null && typenameOf(row.type) === typename))
    .reduce((total, row) => total + row.count, 0);

/** Distinct versionless typenames across `rows`; two schema versions of one type count once. */
export const countTypenames = (rows: readonly TypeCount[]): number =>
  new Set(rows.flatMap((row) => (row.type !== null ? [typenameOf(row.type)] : []))).size;
