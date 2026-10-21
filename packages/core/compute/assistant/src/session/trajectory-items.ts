//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Feed, Filter, Obj } from '@dxos/echo';
import { Trajectory } from '@dxos/trajectory';

import * as Legacy from './Legacy.ts';

/** Trajectory events and the legacy records a feed may still hold. */
const items = Filter.or(Filter.type(Trajectory.Event), ...Legacy.types.map((type) => Filter.type(type)));

export type ReadRange = {
  /** Read after this local cursor ({@link Feed.getLocalCursor}); the start of the feed when absent. */
  after?: Feed.Cursor;
  /** Read up to but not including this local cursor. */
  before?: Feed.Cursor;
};

/**
 * The trajectory items in `feed` (events and legacy records), in the order this replica stored them: an order sync
 * never changes, so state folded from it stays valid as the feed is repositioned.
 */
export const readItems = (
  feed: Feed.Feed,
  range: ReadRange = {},
): Effect.Effect<(Trajectory.Event | Legacy.Record)[], never, Database.Service> =>
  Effect.map(
    Feed.query(
      feed,
      Filter.and(items, Filter.feedCursor({ begin: range.after ?? Feed.START, end: range.before, order: 'local' })),
    ).run,
    (results) =>
      results.filter(
        (item): item is Trajectory.Event | Legacy.Record =>
          Obj.instanceOf(Trajectory.Event, item) || Legacy.isRecord(item),
      ),
  );
