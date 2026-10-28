//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { useContext, useEffect, useRef } from 'react';

import { type Clock, MAX_CLOCK_STEP } from '@dxos/animation';

export type UseClockOptions = {
  /** Seconds; playback stops (or wraps) there. Unbounded when unset or zero. */
  duration?: number;
  loop?: boolean;
};

/**
 * A clock's one animation loop (react-ui-canvas ANIMATION.md §5.1): while the clock plays, each frame advances its
 * time by the wall time since the last, capped at `MAX_CLOCK_STEP`. The first frame after a start advances nothing, so
 * no step is ever negative. Reading the wall clock is this hook's alone; everything animated reads the clock's time.
 */
export const useClock = (clock: Clock, { duration = 0, loop = false }: UseClockOptions = {}): void => {
  const registry = useContext(RegistryContext);
  const playing = useAtomValue(clock.playing);
  // Read per frame, so a change of length or looping does not restart the loop (a restart's first step is empty).
  const boundsRef = useRef({ duration, loop });
  boundsRef.current = { duration, loop };
  useEffect(() => {
    if (!playing) {
      return;
    }
    let last: number | undefined;
    let frame = requestAnimationFrame(function step() {
      const now = performance.now();
      const seconds = last === undefined ? 0 : Math.min(MAX_CLOCK_STEP, Math.max(0, (now - last) / 1000));
      last = now;
      if (seconds > 0) {
        const { duration, loop } = boundsRef.current;
        const next = registry.get(clock.time) + seconds * registry.get(clock.rate);
        if (duration > 0 && next >= duration) {
          if (loop) {
            registry.set(clock.time, next % duration);
          } else {
            registry.set(clock.time, duration);
            registry.set(clock.playing, false);
            return;
          }
        } else {
          registry.set(clock.time, next);
        }
      }
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, registry, clock]);
};
