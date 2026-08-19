//
// Copyright 2026 DXOS.org
//

import { Feed, Obj, Type } from '@dxos/echo';

import { type SpaceStats } from './types';

const FEED_TYPENAME = Type.getTypename(Feed.Feed);

/**
 * Counts shown while nothing is running. Derived from a single "everything" query rather than one
 * query per statistic — a peripheral display is a glance, not a report.
 */
export const toSpaceStats = (objects: readonly Obj.Unknown[], plugins: number): SpaceStats => {
  const typenames = objects.map((object) => Obj.getTypename(object));
  return {
    objects: objects.length,
    feeds: typenames.filter((typename) => typename === FEED_TYPENAME).length,
    types: new Set(typenames.filter(Boolean)).size,
    plugins,
  };
};
