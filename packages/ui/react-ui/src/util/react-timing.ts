//
// Copyright 2026 DXOS.org
//

/** React's development build prefixes the name of every Components-track measure with a zero-width space. */
const REACT_COMPONENT_MEASURE_PREFIX = '​';

/**
 * Clears React's per-render component measures from the performance timeline buffer as they land.
 *
 * React's development build calls `performance.measure` — with a diff of the changed props as its
 * `detail` — for every re-render whose props changed, and the browser keeps every entry for the life
 * of the realm: one scripted 20-turn chat left ~190k of them, a few MB of heap that never came back.
 * DevTools' Performance panel records each one into its trace when it is made, so emptying the buffer
 * loses nothing a profile shows. Production builds emit none. Returns a function that stops trimming.
 */
export const trimReactPerformanceEntries = (): (() => void) => {
  if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes('measure')) {
    return () => {};
  }

  const observer = new PerformanceObserver((list) => {
    const names = new Set<string>();
    for (const entry of list.getEntries()) {
      if (entry.name.startsWith(REACT_COMPONENT_MEASURE_PREFIX)) {
        names.add(entry.name);
      }
    }
    for (const name of names) {
      performance.clearMeasures(name);
    }
  });
  observer.observe({ type: 'measure' });
  return () => observer.disconnect();
};
