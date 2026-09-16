//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { type Attached } from '../cdp.ts';
import { type ResponsivenessMetrics } from '../types.ts';

/**
 * How long a timer may overshoot before the overshoot counts as lag.
 *
 * A 16 ms nominal interval on a busy machine routinely lands a few ms late with nothing blocking,
 * so the floor keeps ordinary scheduler jitter out of a metric meant to catch a blocked loop.
 */
const LAG_FLOOR_MS = 8;

const LAG_INTERVAL_MS = 16;

/**
 * Installs the timer-drift probe and the long-task observer before any page script runs.
 *
 * Two probes rather than one because they see different things: the Long Tasks API reports work on
 * the main thread only, while drift is measurable in ANY realm — and the realm that blocks under a
 * large space is usually the shared worker, which no page-side API can observe.
 */
export const installProbes = (page: Page): Promise<void> =>
  page.addInitScript(
    ({ intervalMs, floorMs }: { intervalMs: number; floorMs: number }) => {
      (globalThis as any).__perfLag = [];
      (globalThis as any).__longTasks = [];

      let last = performance.now();
      setInterval(() => {
        const now = performance.now();
        const drift = now - last - intervalMs;
        last = now;
        if (drift > floorMs) {
          (globalThis as any).__perfLag.push(drift);
        }
      }, intervalMs);

      try {
        if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (globalThis as any).__longTasks.push({ start: entry.startTime, duration: entry.duration });
            }
          }).observe({ type: 'longtask', buffered: true });
        }
      } catch {
        // Long Tasks API is chromium-only; the drift probe still reports.
      }
    },
    { intervalMs: LAG_INTERVAL_MS, floorMs: LAG_FLOOR_MS },
  );

/**
 * Installs the drift probe in a non-page realm, idempotently.
 *
 * `addInitScript` reaches the page and its frames only, so the shared worker — the realm that
 * actually blocks when a space gets large — needs the probe pushed in over CDP. Guarded on the
 * array's existence because the target set is reconciled at every stage boundary, and a second
 * interval would double-count every sample.
 */
export const installWorkerProbe = async (target: Attached): Promise<void> => {
  if (target.kind === 'page') {
    return;
  }
  await target.cdp.trySend('Runtime.evaluate', {
    expression: `(() => {
      if (globalThis.__perfLag) {
        return 'present';
      }
      globalThis.__perfLag = [];
      let last = performance.now();
      setInterval(() => {
        const now = performance.now();
        const drift = now - last - ${LAG_INTERVAL_MS};
        last = now;
        if (drift > ${LAG_FLOOR_MS}) {
          globalThis.__perfLag.push(drift);
        }
      }, ${LAG_INTERVAL_MS});
      return 'installed';
    })()`,
    returnByValue: true,
  });
};

type Samples = { lag: number[]; longTasks: Array<{ start: number; duration: number }> };

/** Reads and CLEARS the probes, so each stage reports only the samples it produced. */
const drainPage = (page: Page): Promise<Samples> =>
  page.evaluate(() => {
    const lag: number[] = (globalThis as any).__perfLag ?? [];
    const longTasks: Array<{ start: number; duration: number }> = (globalThis as any).__longTasks ?? [];
    (globalThis as any).__perfLag = [];
    (globalThis as any).__longTasks = [];
    return { lag: [...lag], longTasks: [...longTasks] };
  });

/**
 * Drains the drift probe from a non-page realm over CDP.
 *
 * `Runtime.evaluate` against the worker's own context, because there is no Playwright handle for a
 * shared worker — and a shared worker blocked for 800 ms on a ref-resolution storm is the failure
 * this whole metric exists to catch.
 */
const drainTarget = async (target: Attached): Promise<number[]> => {
  const result = await target.cdp.trySend<{ result: { value?: number[] } }>('Runtime.evaluate', {
    expression: '(() => { const s = globalThis.__perfLag ?? []; globalThis.__perfLag = []; return [...s]; })()',
    returnByValue: true,
  });
  return result?.result?.value ?? [];
};

/**
 * Nearest-rank percentile of a sample set, rounded.
 *
 * Exported for its own test: the index arithmetic is the kind that reads correct and is off by
 * one, and it feeds a trended metric where that error reports the worst sample as the 95th.
 */
export const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  // Nearest-rank: `ceil(fraction * n) - 1`. `floor(fraction * n)` overshoots by one whenever the
  // product is an integer — p95 of 20 samples would return the maximum (index 19) rather than
  // index 18, which reports the worst sample as if it were the 95th percentile.
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return Math.round(sorted[index]);
};

/**
 * Total Blocking Time over the stage — each long task's duration above 50 ms.
 *
 * Not gated to a paint event as the Lighthouse definition is: a stage that starts long after first
 * contentful paint has no such gate, so every long task inside it blocks an interaction the user
 * has already made.
 */
const blockingTime = (longTasks: Array<{ duration: number }>): number =>
  Math.round(longTasks.reduce((total, task) => total + Math.max(0, task.duration - 50), 0));

/** Collects both probes across every realm, then clears them for the next stage. */
export const readResponsiveness = async (
  page: Page,
  targets: Attached[],
): Promise<Omit<ResponsivenessMetrics, 'stillFrameMaxMs' | 'stillFrameCount'>> => {
  const pageSamples = await drainPage(page).catch(() => ({ lag: [], longTasks: [] }));
  const workerLag = await Promise.all(targets.filter((target) => target.kind !== 'page').map(drainTarget));
  const lag = [...pageSamples.lag, ...workerLag.flat()];
  return {
    longTaskCount: pageSamples.longTasks.length,
    longTaskMaxMs: Math.round(Math.max(0, ...pageSamples.longTasks.map((task) => task.duration))),
    tbtMs: blockingTime(pageSamples.longTasks),
    lagP95Ms: percentile(lag, 0.95),
    lagMaxMs: Math.round(Math.max(0, ...lag)),
  };
};
