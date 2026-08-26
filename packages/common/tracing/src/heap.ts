//
// Copyright 2026 DXOS.org
//

/**
 * JS heap usage of the calling realm.
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export type HeapInfo = {
  used: number;
  total: number;
  limit: number;
};

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
};

/** Chromium-only, hence the feature test rather than a direct read; reports the calling realm alone. */
export const readHeap = (): HeapInfo | undefined => {
  const memory = (globalThis.performance as PerformanceWithMemory | undefined)?.memory;
  if (!memory) {
    return undefined;
  }

  return { used: memory.usedJSHeapSize, total: memory.totalJSHeapSize, limit: memory.jsHeapSizeLimit };
};
