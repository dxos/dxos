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
 * Backstop for the paint wait, for hosts where frames never come — a backgrounded tab does not
 * run `requestAnimationFrame`, and the idle wave must not be lost to that.
 */
const PAINT_TIMEOUT = 2_000;

/**
 * Completes after the shell has painted. Two frames: the first callback runs before paint, the
 * second after it. Without this the idle timeout below can expire mid-render-pipeline, flooding
 * the main thread ahead of first paint — precisely the cost the wait exists to avoid.
 */
const afterPaint: Effect.Effect<void> = Effect.suspend(() => {
  if (typeof requestAnimationFrame !== 'function') {
    return Effect.void;
  }
  return Effect.callback<void>((resume) => {
    let inner: number | undefined;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => resume(Effect.void));
    });
    return Effect.sync(() => {
      cancelAnimationFrame(outer);
      inner !== undefined && cancelAnimationFrame(inner);
    });
  }).pipe(
    Effect.timeout(PAINT_TIMEOUT),
    Effect.catch(() => Effect.void),
  );
});

/**
 * Whether the host has a paint the idle wave should yield to. False under node and workerd, where
 * {@link whenIdle} completes immediately — so forking the wave there buys nothing and only leaves
 * it unfinished when `start()` returns.
 */
export const hostYieldsToPaint = (): boolean => typeof requestIdleCallback === 'function';

/**
 * Completes once the host is idle, so work scheduled behind it lands after the shell has painted
 * rather than competing with it.
 */
export const whenIdle: Effect.Effect<void> = Effect.suspend(() => {
  if (!hostYieldsToPaint()) {
    return Effect.void;
  }
  return afterPaint.pipe(
    Effect.andThen(
      Effect.callback<void>((resume) => {
        const handle = requestIdleCallback(() => resume(Effect.void), { timeout: IDLE_TIMEOUT });
        return Effect.sync(() => cancelIdleCallback(handle));
      }),
    ),
  );
});
