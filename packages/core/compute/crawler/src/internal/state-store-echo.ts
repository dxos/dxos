//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import * as CrawlState from '../CrawlState.ts';
import type * as StateStore from '../StateStore.ts';

/** The {@link StateStore.Service} over a {@link CrawlState.CrawlState} object; every write lands on it at once. */
export const makeEcho = (state: CrawlState.CrawlState): StateStore.Service => ({
  pushTargets: (targets) => Effect.sync(() => CrawlState.pushTargets(state, targets)),
  nextActionable: () =>
    Effect.sync(() =>
      CrawlState.listTargets(state)
        .reverse()
        .find((target) => target.status === 'pending' || target.status === 'active'),
    ),
  hasActionable: () =>
    Effect.sync(() =>
      CrawlState.listTargets(state).some((target) => target.status === 'pending' || target.status === 'active'),
    ),
  setCursor: (targetId, cursor) =>
    Effect.gen(function* () {
      // Clock keeps the write deterministic under TestClock.
      const at = new Date(yield* Clock.currentTimeMillis).toISOString();
      CrawlState.setCursor(state, targetId, cursor, at);
    }),
  setStatus: (targetId, status, error) => Effect.sync(() => CrawlState.setStatus(state, targetId, status, error)),
  resetTargets: (targetIds) => Effect.sync(() => CrawlState.resetTargets(state, targetIds)),
  removeTargets: (targetIds) => Effect.sync(() => CrawlState.removeTargets(state, targetIds)),
  listTargets: () => Effect.sync(() => CrawlState.listTargets(state)),
  setRunStatus: (status) => Effect.sync(() => CrawlState.setRunStatus(state, status)),
  getRunStatus: () => Effect.sync(() => state.runStatus),
});
