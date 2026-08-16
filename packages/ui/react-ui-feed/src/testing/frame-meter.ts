//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

/** How often the readout is published. Per-frame state would itself be the thing dropping frames. */
const REPORT_INTERVAL = 250;

/**
 * A frame longer than this counts as a hitch: two intervals of a 60Hz display, the point at which a
 * pause stops reading as motion and starts reading as a stutter. Deliberately absolute rather than
 * derived from the display's rate — the question is whether a reader notices, not whether the
 * hardware's budget was met.
 */
const HITCH_MS = 32;

export type FrameStats = {
  /** Frames per second over the last reporting window; 0 until the first window closes. */
  fps: number;
  /** Longest frame (ms) since the last reset — the hitch a reader actually feels. */
  worst: number;
  /** Frames over {@link HITCH_MS} since the last reset. */
  hitches: number;
  /** Frames sampled since the last reset, so a reading of zero hitches can be weighed. */
  frames: number;
};

const EMPTY: FrameStats = { fps: 0, worst: 0, hitches: 0, frames: 0 };

/**
 * Samples animation-frame intervals for as long as it is mounted.
 *
 * This exists because scroll smoothness is the deciding criterion for the feed engine and no
 * automated harness can report it: an agent's browser throttles `requestAnimationFrame`, so the
 * number is only meaningful when a human is driving. The averages hide the defect — a scroll that
 * holds 60fps and stalls once for 200ms reads as smooth in a mean and as broken to a reader — so
 * the worst frame and the hitch count are reported alongside the rate, and reset on demand.
 */
export const useFrameMeter = (): FrameStats & { reset: () => void } => {
  const [stats, setStats] = useState<FrameStats>(EMPTY);
  const worst = useRef(0);
  const hitches = useRef(0);
  const frames = useRef(0);

  const reset = useCallback(() => {
    worst.current = 0;
    hitches.current = 0;
    frames.current = 0;
    setStats(EMPTY);
  }, []);

  useEffect(() => {
    let handle = 0;
    let last = performance.now();
    let windowStart = last;
    let windowFrames = 0;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      frames.current++;
      windowFrames++;
      if (delta > worst.current) {
        worst.current = delta;
      }
      if (delta > HITCH_MS) {
        hitches.current++;
      }

      const elapsed = now - windowStart;
      if (elapsed >= REPORT_INTERVAL) {
        setStats({
          fps: Math.round((windowFrames * 1000) / elapsed),
          worst: Math.round(worst.current),
          hitches: hitches.current,
          frames: frames.current,
        });
        windowStart = now;
        windowFrames = 0;
      }

      handle = requestAnimationFrame(tick);
    };

    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, []);

  return { ...stats, reset };
};
