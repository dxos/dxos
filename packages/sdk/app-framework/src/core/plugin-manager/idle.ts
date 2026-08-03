//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * Backstop for the idle wait. An aggressive timeout fires mid-render and floods the main thread
 * ahead of first paint, which is the cost this wait exists to avoid; this only rescues a host
 * that never goes idle at all.
 */
const IDLE_TIMEOUT = 15_000;

/**
 * Completes once the host is idle, so work scheduled behind it lands after the shell has painted
 * rather than competing with it.
 *
 * Feature-tested rather than presence-checked on a platform flag: `requestIdleCallback` is
 * browser-only and this package also builds for node and workerd, where there is no paint to
 * yield to and completing immediately is the correct behaviour.
 */
export const whenIdle: Effect.Effect<void> = Effect.suspend(() => {
  if (typeof requestIdleCallback !== 'function') {
    return Effect.void;
  }
  return Effect.async<void>((resume) => {
    const handle = requestIdleCallback(() => resume(Effect.void), { timeout: IDLE_TIMEOUT });
    return Effect.sync(() => cancelIdleCallback(handle));
  });
});
