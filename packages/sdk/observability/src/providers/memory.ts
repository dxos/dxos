//
// Copyright 2026 DXOS.org
//

/** Realms `measureUserAgentSpecificMemory` attributes usage to. Bounded, so it is safe as a metric attribute. */
export type MemoryScope = 'window' | 'shared-worker' | 'dedicated-worker' | 'other';

export type CrossRealmMemory = Partial<Record<MemoryScope, number>>;

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  measureUserAgentSpecificMemory?: () => Promise<UserAgentSpecificMemory>;
};

export type MemoryBreakdownEntry = { bytes: number; attribution: { scope?: string }[] };

type UserAgentSpecificMemory = {
  bytes: number;
  breakdown: MemoryBreakdownEntry[];
};

/** Chromium-only and main-thread-only, hence the feature test rather than a direct read. */
export const readHeap = (): { used?: number; total?: number; limit?: number } => {
  const memory = (globalThis.performance as PerformanceWithMemory | undefined)?.memory;
  if (!memory) {
    return {};
  }

  return { used: memory.usedJSHeapSize, total: memory.totalJSHeapSize, limit: memory.jsHeapSizeLimit };
};

export const supportsCrossRealmMemory = (): boolean =>
  typeof (globalThis.performance as PerformanceWithMemory | undefined)?.measureUserAgentSpecificMemory === 'function';

/**
 * Cross-realm memory usage, which is the only way to see the shared and dedicated workers —
 * `performance.memory` reports the calling realm alone, and Composer's heaviest consumers are workers.
 * Requires cross-origin isolation, and resolves only after a garbage collection, so callers must
 * sample it on their own cadence rather than inside a metric collection callback.
 */
export const measureCrossRealmMemory = async (): Promise<CrossRealmMemory | undefined> => {
  const performanceWithMemory = globalThis.performance as PerformanceWithMemory | undefined;
  const measure = performanceWithMemory?.measureUserAgentSpecificMemory;
  if (!measure) {
    return undefined;
  }

  return foldBreakdown((await measure.call(performanceWithMemory)).breakdown);
};

/**
 * Folds a `measureUserAgentSpecificMemory` breakdown into per-realm totals.
 * An entry with no attribution is unattributed shared cost and is bucketed as `other` rather than
 * dropped, so the scopes still sum to the reported total.
 */
export const foldBreakdown = (breakdown: MemoryBreakdownEntry[]): CrossRealmMemory => {
  const totals: CrossRealmMemory = {};
  for (const entry of breakdown) {
    const scope = toScope(entry.attribution[0]?.scope);
    totals[scope] = (totals[scope] ?? 0) + entry.bytes;
  }

  return totals;
};

const toScope = (scope: string | undefined): MemoryScope => {
  switch (scope) {
    case 'Window':
      return 'window';
    case 'SharedWorkerGlobalScope':
      return 'shared-worker';
    case 'DedicatedWorkerGlobalScope':
      return 'dedicated-worker';
    default:
      return 'other';
  }
};
