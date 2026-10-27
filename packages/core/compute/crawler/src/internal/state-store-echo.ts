//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';

import * as CrawlState from '../CrawlState.ts';
import type * as StateStore from '../StateStore.ts';

/** The {@link StateStore.Service} over a {@link CrawlState.CrawlState} object; every write lands on it at once. */
export const makeEcho = (state: CrawlState.CrawlState): StateStore.Service => {
  const update = (write: (draft: CrawlState.Draft) => void) =>
    Effect.sync(() => {
      Obj.update(state, write);
    });

  return {
    pushTargets: (targets) => update((draft) => CrawlState.pushTargets(draft, targets)),
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
    setCursor: Effect.fnUntraced(function* (targetId: string, cursor: string) {
      // Clock keeps the write deterministic under TestClock.
      const at = new Date(yield* Clock.currentTimeMillis).toISOString();
      yield* update((draft) => CrawlState.setCursor(draft, targetId, cursor, at));
    }),
    setStatus: (targetId, status, error) => update((draft) => CrawlState.setStatus(draft, targetId, status, error)),
    resetTargets: (targetIds) => update((draft) => CrawlState.resetTargets(draft, targetIds)),
    removeTargets: (targetIds) => update((draft) => CrawlState.removeTargets(draft, targetIds)),
    listTargets: () => Effect.sync(() => CrawlState.listTargets(state)),
    setRunStatus: (status) => update((draft) => CrawlState.setRunStatus(draft, status)),
    getRunStatus: () => Effect.sync(() => state.runStatus),
  };
};
