//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Trajectory from '@dxos/compute/Trajectory';
import { type Database, Feed, Filter, Obj } from '@dxos/echo';

import * as Legacy from './Legacy.ts';

/** Trajectory events and the legacy records a feed may still hold. */
const items = Filter.or(Filter.type(Trajectory.Event), ...Legacy.types.map((type) => Filter.type(type)));

/**
 * The trajectory items in `feed` (events and legacy records) on every branch, so every thread, walked in the order
 * this replica stored them: an order sync never changes, so state folded from it stays valid as the feed is
 * repositioned.
 */
export const readItems = (
  feed: Feed.Feed,
  range: { readonly after?: Feed.LocalCursor } = {},
): Effect.Effect<(Trajectory.Event | Legacy.Record)[], never, Database.Service> =>
  Effect.map(
    Feed.walk(feed, items, { branch: 'all', ...(range.after !== undefined ? { begin: range.after } : {}) }).run,
    (results) => results.filter(isItem),
  );

/** The item the walk of every branch ends on: the last a fold of the whole feed takes in. */
export const lastItem = (
  feed: Feed.Feed,
): Effect.Effect<Trajectory.Event | Legacy.Record | undefined, never, Database.Service> =>
  Effect.map(Feed.walk(feed, items, { branch: 'all', order: 'desc', limit: 1 }).run, (results) => results.find(isItem));

/**
 * The last item a reader of `thread` (absent: main) sees: the head of its branch, or of the ancestor it forked from.
 * A thread opened inside `thread` forks there.
 */
export const lastOn = (
  feed: Feed.Feed,
  thread: Trajectory.ThreadId | undefined,
): Effect.Effect<Trajectory.Event | Legacy.Record | undefined, never, Database.Service> =>
  Effect.map(Feed.walk(feed, items, { branch: thread ?? null, order: 'desc', limit: 1 }).run, (results) =>
    results.find(isItem),
  );

const isItem = (item: Obj.Unknown): item is Trajectory.Event | Legacy.Record =>
  Obj.instanceOf(Trajectory.Event, item) || Legacy.isRecord(item);
