//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';

import { IBKR_FEED_KIND } from '../constants';
import { Ibkr } from '../types';

/** Per-space feed holding the daily {@link Ibkr.Report} snapshots, or undefined before the first sync. */
export const findPortfolioFeed = Effect.gen(function* () {
  const { db } = yield* Database.Service;
  const feeds = yield* Effect.promise(() => db.query(Filter.type(Feed.Feed)).run());
  return feeds.find((feed) => feed.kind === IBKR_FEED_KIND);
});

/** The portfolio feed, creating it on first sync if absent. */
export const getOrCreatePortfolioFeed = Effect.gen(function* () {
  const existing = yield* findPortfolioFeed;
  if (existing) {
    return existing;
  }
  const { db } = yield* Database.Service;
  return db.add(Feed.make({ name: 'Interactive Brokers', kind: IBKR_FEED_KIND }));
});

/** The most recent stored report, or undefined when no sync has run yet. */
export const latestReport = Effect.gen(function* () {
  const feed = yield* findPortfolioFeed;
  if (!feed) {
    return undefined;
  }
  const reports = yield* Feed.runQuery(feed, Filter.type(Ibkr.Report));
  // ISO timestamps sort lexicographically; take the newest.
  const [latest] = [...reports].sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt));
  return latest;
});
