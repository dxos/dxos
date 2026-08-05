//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * Reads the current list from one of the provider's subscriptions. Providers expose only
 * subscriptions, whose contract is to deliver the current list immediately, so this takes the first
 * emission and unsubscribes. Yields an empty list when the backend has no such subscription.
 */
export const readOnce = <T>(
  subscribe: ((onItems: (items: readonly T[]) => void) => () => void) | undefined,
): Effect.Effect<readonly T[]> =>
  Effect.async<readonly T[]>((resume) => {
    let done = false;
    // The first emission can arrive before `subscribe` returns, so the handle may not be assigned
    // yet — `done` tells the late assignment to unsubscribe instead.
    let unsubscribe: (() => void) | undefined;
    const handle = subscribe?.((items) => {
      if (done) {
        return;
      }
      done = true;
      unsubscribe?.();
      resume(Effect.succeed(items));
    });

    if (done) {
      handle?.();
    } else {
      unsubscribe = handle;
    }

    if (!handle && !done) {
      done = true;
      resume(Effect.succeed([]));
    }

    return Effect.sync(() => {
      done = true;
      unsubscribe?.();
    });
  });
