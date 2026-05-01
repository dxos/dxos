//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

export type CpuInfo = {
  /** Estimated frames per second (60 = smooth, lower = main-thread pressure). */
  frameRate: number;
  /** Fraction of main-thread time blocked by long tasks in the last 5 s (0–1). */
  load: number;
};

const FRAME_WINDOW = 30;
const LOAD_WINDOW_MS = 5_000;

/**
 * Estimates browser main-thread load using rAF frame timing and PerformanceObserver longtask entries.
 * Updates once per second.
 */
export const useCpuLoad = (): CpuInfo => {
  const [info, setInfo] = useState<CpuInfo>({ frameRate: 0, load: 0 });

  useEffect(() => {
    const frameTimes: number[] = [];
    let rafId: number;
    let lastTs: number | undefined;

    const onFrame = (ts: number) => {
      if (lastTs !== undefined) {
        frameTimes.push(ts - lastTs);
        if (frameTimes.length > FRAME_WINDOW) {
          frameTimes.shift();
        }
      }
      lastTs = ts;
      rafId = requestAnimationFrame(onFrame);
    };
    rafId = requestAnimationFrame(onFrame);

    const longTaskEntries: { start: number; duration: number }[] = [];
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskEntries.push({ start: entry.startTime, duration: entry.duration });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask not supported in this environment.
    }

    const interval = setInterval(() => {
      const now = performance.now();

      const fps =
        frameTimes.length > 1 ? Math.round(1000 / (frameTimes.reduce((acc, t) => acc + t, 0) / frameTimes.length)) : 0;

      const cutoff = now - LOAD_WINDOW_MS;
      while (longTaskEntries.length > 0 && longTaskEntries[0].start < cutoff) {
        longTaskEntries.shift();
      }
      const busyMs = longTaskEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const load = Math.min(1, busyMs / LOAD_WINDOW_MS);

      setInfo({ frameRate: fps, load });
    }, 1_000);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      clearInterval(interval);
    };
  }, []);

  return info;
};
