//
// Copyright 2026 DXOS.org
//

import { useSyncExternalStore } from 'react';

/**
 * Per-surface dev metrics, complementing the render-timing data collected by the
 * React Profiler ({@link SurfaceProfilerStats}). Captures dispatch-level signals
 * the Profiler cannot see: how many candidates matched, whether the consumer's
 * `data` prop is referentially unstable (the most common Surface footgun), error
 * boundary trips, and mount churn.
 *
 * Keyed by the same `surface/<id>/<role>` identifier the Profiler uses, so the
 * two can be joined in the devtools panel.
 */
export type SurfaceMetric = {
  /** `surface/<id>/<role>`. */
  id: string;
  /** Surface definition id. */
  surfaceId: string;
  /** Resolved role NSID. */
  role: string;
  /** Number of times the dispatcher resolved candidates for this surface. */
  dispatches: number;
  /** Candidates matched on the last dispatch. */
  candidates: number;
  /** `true` when more candidates matched than `limit` rendered. */
  truncated: boolean;
  /** `true` when the `data` prop identity churns across renders without changing value. */
  dataUnstable: boolean;
  /** Consecutive renders where `data` identity changed but value did not. */
  dataChurn: number;
  /** Error boundary trips. */
  errors: number;
  /** Mounts of the matched component. */
  mounts: number;
  /** Unmounts of the matched component. */
  unmounts: number;
};

/** Consecutive unstable renders before `dataUnstable` is flagged. */
const UNSTABLE_THRESHOLD = 3;

export const surfaceMetricKey = (surfaceId: string, role: string): string => `surface/${surfaceId}/${role}`;

/**
 * Shallow (top-level) value equality. Used to distinguish a genuinely new `data`
 * value from a new object/array carrying the same content (the unstable-prop case).
 */
const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
};

/**
 * Singleton store of surface dev metrics. A module singleton (rather than a React
 * context) so the debug overlay — which renders in its own root outside the app's
 * provider tree — can read the same data as the in-app devtools panel.
 */
class SurfaceMetricsStore {
  #metrics = new Map<string, SurfaceMetric>();
  #snapshot: SurfaceMetric[] = [];
  #listeners = new Set<() => void>();
  #pendingNotify = false;

  #entry(surfaceId: string, role: string): SurfaceMetric {
    const id = surfaceMetricKey(surfaceId, role);
    let metric = this.#metrics.get(id);
    if (!metric) {
      metric = {
        id,
        surfaceId,
        role,
        dispatches: 0,
        candidates: 0,
        truncated: false,
        dataUnstable: false,
        dataChurn: 0,
        errors: 0,
        mounts: 0,
        unmounts: 0,
      };
      this.#metrics.set(id, metric);
    }
    return metric;
  }

  /**
   * Records a dispatch. `previousData` is the consumer's prior `data` reference;
   * the store derives churn/instability from the identity-vs-value comparison.
   */
  recordDispatch(
    surfaceId: string,
    role: string,
    args: { candidates: number; truncated: boolean; dataChurn: number },
  ): void {
    const metric = this.#entry(surfaceId, role);
    metric.dispatches += 1;
    metric.candidates = args.candidates;
    metric.truncated = args.truncated;
    metric.dataChurn = args.dataChurn;
    metric.dataUnstable = args.dataChurn >= UNSTABLE_THRESHOLD;
    this.#schedule();
  }

  recordError(surfaceId: string, role: string): void {
    this.#entry(surfaceId, role).errors += 1;
    this.#schedule();
  }

  recordMount(surfaceId: string, role: string): void {
    this.#entry(surfaceId, role).mounts += 1;
    this.#schedule();
  }

  recordUnmount(surfaceId: string, role: string): void {
    this.#entry(surfaceId, role).unmounts += 1;
    this.#schedule();
  }

  clear(): void {
    this.#metrics.clear();
    this.#snapshot = [];
    this.#notify();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = (): SurfaceMetric[] => this.#snapshot;

  /** Defers notification to the next frame to coalesce bursts of records. */
  #schedule(): void {
    if (this.#pendingNotify || typeof requestAnimationFrame === 'undefined') {
      if (typeof requestAnimationFrame === 'undefined') {
        this.#notify();
      }
      return;
    }
    this.#pendingNotify = true;
    requestAnimationFrame(() => {
      this.#pendingNotify = false;
      this.#notify();
    });
  }

  #notify(): void {
    this.#snapshot = [...this.#metrics.values()];
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

export const surfaceMetrics = new SurfaceMetricsStore();

/**
 * Updates the running churn count for a consumer's `data` prop.
 *
 * @returns the new churn count (0 when `data` changed value or is unchanged).
 */
export const nextDataChurn = (previous: unknown, next: unknown, churn: number): number => {
  if (Object.is(previous, next)) {
    return churn;
  }
  // New reference: churn only when the value is structurally the same (unstable identity).
  return shallowEqual(previous, next) ? churn + 1 : 0;
};

/**
 * Subscribes to surface dev metrics, sorted with the most concerning first
 * (unstable data, then errors, then dispatch count).
 */
export const useSurfaceMetrics = (): SurfaceMetric[] => {
  const metrics = useSyncExternalStore(
    surfaceMetrics.subscribe,
    surfaceMetrics.getSnapshot,
    surfaceMetrics.getSnapshot,
  );
  return [...metrics].sort(
    (a, b) => Number(b.dataUnstable) - Number(a.dataUnstable) || b.errors - a.errors || b.dispatches - a.dispatches,
  );
};
