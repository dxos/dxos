//
// Copyright 2026 DXOS.org
//

import type * as Registry from 'effect/reactivity/AtomRegistry';
import { useEffect, useRef } from 'react';

import { type Clock, DEFAULT_FPS, type Timeline, exposeClock } from '@dxos/animation';

/** What a frame renderer exports: the clock's length and rate. */
export type ExposedSpan = Pick<Timeline, 'duration' | 'fps'>;

/**
 * Publishes a clock for a frame renderer, which seeks the clock rather than faking the browser's
 * (react-ui-canvas ANIMATION.md §7.2); `exportable` off, nothing is published.
 */
export const useExposedClock = (
  registry: Registry.AtomRegistry,
  clock: Clock,
  span: ExposedSpan | undefined,
  exportable: boolean | undefined,
) => {
  const spanRef = useRef<ExposedSpan | undefined>(span);
  spanRef.current = span;
  useEffect(
    () =>
      exportable
        ? exposeClock(registry, clock, () => ({
            duration: spanRef.current?.duration ?? 0,
            fps: spanRef.current?.fps ?? DEFAULT_FPS,
          }))
        : undefined,
    [exportable, registry, clock],
  );
};
