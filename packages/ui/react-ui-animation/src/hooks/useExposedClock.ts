//
// Copyright 2026 DXOS.org
//

import type * as Registry from 'effect/reactivity/AtomRegistry';
import { useEffect, useRef } from 'react';

import { type Clock, type Timeline, exposeClock, timelineFps } from '@dxos/animation';

/**
 * Publishes a clock for a frame renderer, which seeks the clock rather than faking the browser's
 * (react-ui-canvas ANIMATION.md §7.2); `exportable` off, nothing is published.
 */
export const useExposedClock = (
  registry: Registry.AtomRegistry,
  clock: Clock,
  timeline: Timeline | undefined,
  exportable: boolean | undefined,
) => {
  const timelineRef = useRef<Timeline | undefined>(timeline);
  timelineRef.current = timeline;
  useEffect(
    () =>
      exportable
        ? exposeClock(registry, clock, () => ({
            duration: timelineRef.current?.duration ?? 0,
            fps: timelineFps(timelineRef.current),
          }))
        : undefined,
    [exportable, registry, clock],
  );
};
