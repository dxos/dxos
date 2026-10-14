//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

export type TimeRange = { start: number; end: number };

/** How long the axis takes to settle on new bounds. */
const TWEEN_DURATION = 400;

const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3;

/** Motion is skipped where nothing would see it, or where the reader asked for less of it. */
const shouldSnap = (): boolean =>
  typeof document === 'undefined' ||
  document.hidden ||
  (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/**
 * The range to draw with: `target`, reached over a short ease rather than in one step, so a
 * time axis whose bounds move (a new event, `now` advancing) slides every span, node and tick to
 * its new place together instead of jumping. A new target mid-flight eases on from wherever the
 * drawing is, so a stream of updates reads as one continuous motion.
 */
export const useRangeTween = (target: TimeRange, enabled: boolean): TimeRange => {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    const settle = (range: TimeRange) => {
      shownRef.current = range;
      setShown(range);
    };
    if (!enabled || shouldSnap() || (from.start === target.start && from.end === target.end)) {
      settle(target);
      return;
    }

    let frame: number | undefined;
    const startedAt = performance.now();
    const step = (time: number) => {
      const progress = Math.min((time - startedAt) / TWEEN_DURATION, 1);
      const eased = easeOutCubic(progress);
      settle({
        start: from.start + (target.start - from.start) * eased,
        end: from.end + (target.end - from.end) * eased,
      });
      frame = progress < 1 ? requestAnimationFrame(step) : undefined;
    };
    frame = requestAnimationFrame(step);
    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [enabled, target.start, target.end]);

  return enabled ? shown : target;
};
