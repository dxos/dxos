//
// Copyright 2026 DXOS.org
//

/**
 * The work counters that cost something to run, each switchable.
 *
 * `Performance.getMetrics` counts and the app's data-layer probes are not here: both are read at
 * the boundaries the harness already crosses and cost nothing extra, so they are always on.
 */
export type CounterSet = {
  /** A trace around each stage: elements restyled, objects laid out, forced layouts, instructions. */
  trace: boolean;
  /** V8 precise coverage: exact JS call counts per realm. */
  calls: boolean;
  /** The React devtools hook: commits, renders and wasted renders. */
  react: boolean;
};

/**
 * What runs when `DX_PERF_COUNTERS` is unset: the React hook alone, measured at +3–5% wall. The
 * trace (+7% wall, +10–15% CPU) and coverage (+12–29% wall) would move the CPU series the nightly
 * trends, so they run on request; see METRICS.md §"Instrument cost, measured".
 */
export const DEFAULT_COUNTERS: CounterSet = { trace: false, calls: false, react: true };

const NONE: CounterSet = { trace: false, calls: false, react: false };
const ALL: CounterSet = { trace: true, calls: true, react: true };

const isCounter = (name: string): name is keyof CounterSet => name === 'trace' || name === 'calls' || name === 'react';

/**
 * Parses `DX_PERF_COUNTERS`: `all`, `none`, `default`, or a comma list such as `trace,react`.
 *
 * An unknown name throws rather than being ignored: a typo would otherwise run a different set
 * than asked for while the row's `counters` label said what was intended.
 */
export const parseCounters = (value: string | undefined): CounterSet => {
  const spec = (value ?? '').trim();
  if (spec === '' || spec === 'default') {
    return { ...DEFAULT_COUNTERS };
  }
  if (spec === 'all') {
    return { ...ALL };
  }
  if (spec === 'none') {
    return { ...NONE };
  }
  const set = { ...NONE };
  for (const name of spec.split(',').map((part) => part.trim())) {
    if (!isCounter(name)) {
      throw new Error(`DX_PERF_COUNTERS: unknown counter "${name}" (expected trace, calls, react, all, none)`);
    }
    set[name] = true;
  }
  return set;
};

/** The set as recorded on every row (`comparability.counters`): `trace+react`, or `none`. */
export const countersLabel = (set: CounterSet): string =>
  (['trace', 'calls', 'react'] as const).filter((name) => set[name]).join('+') || 'none';
