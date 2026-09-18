//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type YieldStrategy, shouldYield, yieldOrContinue as yieldOrContinuePromise } from '@dxos/async';

export type { YieldStrategy };

/** Yields to the event loop once the current slice of main-thread work has used its strategy's budget. */
export const yieldOrContinue = (strategy: YieldStrategy): Effect.Effect<void> =>
  Effect.suspend(() => (shouldYield(strategy) ? Effect.promise(() => yieldOrContinuePromise(strategy)) : Effect.void));
