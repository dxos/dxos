//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef } from 'react';

import { type Clock, type Timeline, exposeClock, timelineFps } from '../../model/index.ts';
import { type useRegistry } from '../useRegistry.ts';

/**
 * Publishes the view's clock for a frame renderer, which seeks the clock rather than faking the browser's
 * (ANIMATION.md §7.2); `exportable` off, nothing is published.
 */
export const useExposedClock = (
  registry: ReturnType<typeof useRegistry>,
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
