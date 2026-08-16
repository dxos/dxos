//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

/** How often the live readout is published. Per-frame state would itself be the thing dropping frames. */
const REPORT_INTERVAL = 250;

/**
 * A frame longer than this counts as a hitch: two intervals of a 60Hz display, the point at which a
 * pause stops reading as motion and starts reading as a stutter. Deliberately absolute rather than
 * derived from the display's rate — the question is whether a reader notices, not whether the
 * hardware's budget was met.
 */
const HITCH_MS = 32;

/** Frame durations are bucketed by the millisecond; anything slower than this lands in the last bucket. */
const MAX_BUCKET = 512;

/** Hitches traced per pass. A pass that produces more than this has already failed. */
const MAX_TRACE = 100;

export type FrameStats = {
  /** Frames per second over the last reporting window — what the eye checks while a gesture runs. */
  fps: number;
  /** Rate at the median frame: the pass's typical smoothness. */
  p50: number;
  /** Rate at the 95th-percentile (slowest) frame: what the pass felt like at its worst fifth. */
  p95: number;
  /** Longest frame (ms) since the pass began. */
  worst: number;
  /** Frames over {@link HITCH_MS} since the pass began. */
  hitches: number;
  /** Frames sampled, so a reading of zero hitches can be weighed against how long it was measured. */
  frames: number;
  /** Length of the pass so far (ms). */
  duration: number;
};

const EMPTY: FrameStats = { fps: 0, p50: 0, p95: 0, worst: 0, hitches: 0, frames: 0, duration: 0 };

/**
 * Rate (fps) at the frame standing at `quantile` of a pass, counting from the fast end — so 0.95 is
 * the slow tail, the fifth of the pass a reader would call the stutter.
 *
 * `buckets` counts frames by their duration in whole milliseconds. Exported for its test: this is
 * the number the engine's verdict rests on, and an off-by-one in the walk would flatter it.
 */
export const rateAtQuantile = (buckets: Uint32Array, frames: number, quantile: number): number => {
  if (!frames) {
    return 0;
  }

  const target = frames * quantile;
  let seen = 0;
  for (let ms = 0; ms < buckets.length; ++ms) {
    seen += buckets[ms];
    if (seen >= target) {
      return ms > 0 ? Math.round(1000 / ms) : 0;
    }
  }

  return 0;
};

export type FrameMeterOptions = {
  /** Names the pass in the recorded line — the story's arguments, since they are what varies. */
  label?: string;
};

/** Live statistics plus the control that ends one pass and begins the next. */
export type FrameMeter = FrameStats & { label?: string; record: () => string };

/**
 * Samples animation-frame intervals and records a pass on demand.
 *
 * This exists because scroll smoothness is the deciding criterion for the feed engine and no
 * automated harness can report it: an agent's browser throttles `requestAnimationFrame`, so any
 * number collected there describes the harness. Averages hide the defect — a scroll that holds
 * 60fps and stalls once for 200ms reads as smooth in a mean and as broken to a reader — so the
 * percentiles, the worst frame and the hitch count are reported together, and each hitch is traced
 * to the console as it happens so a bad number can be turned into a cause.
 *
 * Durations are bucketed by the millisecond rather than kept, so a pass costs the same however long
 * it runs; percentiles come out of the histogram.
 */
export const useFrameMeter = ({ label }: FrameMeterOptions = {}): FrameMeter => {
  const [stats, setStats] = useState<FrameStats>(EMPTY);

  const buckets = useRef(new Uint32Array(MAX_BUCKET));
  const worst = useRef(0);
  const hitches = useRef(0);
  const frames = useRef(0);
  const started = useRef(performance.now());
  const labelRef = useRef(label);
  labelRef.current = label;

  const clear = useCallback(() => {
    buckets.current.fill(0);
    worst.current = 0;
    hitches.current = 0;
    frames.current = 0;
    started.current = performance.now();
    setStats(EMPTY);
  }, []);

  const rateAt = useCallback((quantile: number) => rateAtQuantile(buckets.current, frames.current, quantile), []);

  /**
   * Ends the pass: returns its one-line summary, copies it to the clipboard, logs it, and starts a
   * fresh pass. One control, because a pass is exactly the interval between two of these — start a
   * clean one by clicking, run the gesture, click again to record it.
   */
  const record = useCallback((): string => {
    const seconds = (performance.now() - started.current) / 1000;
    const summary = [
      labelRef.current ?? 'pass',
      `p50 ${rateAt(0.5)}`,
      `p95 ${rateAt(0.95)}`,
      `worst ${Math.round(worst.current)}ms`,
      `${hitches.current} hitches`,
      `${frames.current} frames`,
      `${seconds.toFixed(1)}s`,
    ].join(' · ');

    // eslint-disable-next-line no-console
    console.log('[feed] pass', summary);
    void navigator.clipboard?.writeText(summary).catch(() => {
      // Clipboard access is denied in some embedding contexts; the log above is the fallback.
    });

    clear();
    return summary;
  }, [rateAt, clear]);

  useEffect(() => {
    let handle = 0;
    let last = performance.now();
    let windowStart = last;
    let windowFrames = 0;
    let traced = 0;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      frames.current++;
      windowFrames++;
      buckets.current[Math.min(Math.round(delta), MAX_BUCKET - 1)]++;
      if (delta > worst.current) {
        worst.current = delta;
      }
      if (delta > HITCH_MS) {
        hitches.current++;
        if (traced++ < MAX_TRACE) {
          // eslint-disable-next-line no-console
          console.debug('[feed] hitch', {
            ms: Math.round(delta),
            at: Math.round(now - started.current),
            label: labelRef.current,
          });
        }
      }

      const elapsed = now - windowStart;
      if (elapsed >= REPORT_INTERVAL) {
        setStats({
          fps: Math.round((windowFrames * 1000) / elapsed),
          p50: rateAt(0.5),
          p95: rateAt(0.95),
          worst: Math.round(worst.current),
          hitches: hitches.current,
          frames: frames.current,
          duration: Math.round(now - started.current),
        });
        windowStart = now;
        windowFrames = 0;
      }

      handle = requestAnimationFrame(tick);
    };

    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [rateAt]);

  return { ...stats, label, record };
};
