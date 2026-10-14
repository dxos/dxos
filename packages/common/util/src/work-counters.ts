//
// Copyright 2026 DXOS.org
//

/**
 * Global name the counters are published under, for a reader OUTSIDE the realm.
 *
 * The arrangement `@dxos/sql-sqlite` uses for its VFS counters: the work that matters happens in
 * the dedicated worker, where nothing in the tab can call a module export, so a measurement harness
 * attached over CDP evaluates this name in each realm. Nothing in the app reads it.
 */
export const WORK_COUNTERS_GLOBAL = '__dxosWorkCounters';

/** Where the running totals live, so two bundled copies of this module in one realm share them. */
const STORE_GLOBAL = '__dxosWorkCountersStore';

const isStore = (value: unknown): value is Record<string, number> => typeof value === 'object' && value !== null;

const resolveStore = (): Record<string, number> => {
  const existing: unknown = Reflect.get(globalThis, STORE_GLOBAL);
  if (isStore(existing)) {
    return existing;
  }
  const store: Record<string, number> = {};
  Object.assign(globalThis, { [STORE_GLOBAL]: store });
  return store;
};

const counters = resolveStore();

/**
 * Adds to a named running total: `countWork('automerge.saves')`, `countWork('automerge.saveBytes', n)`.
 *
 * Deterministic work counts for the perf harness, which differences two readings to get a stage's
 * share. One property increment, so it is cheap enough to leave on in production.
 */
export const countWork = (name: string, by = 1): void => {
  counters[name] = (counters[name] ?? 0) + by;
};

/** A copy of every running total in this realm. */
export const getWorkCounters = (): Record<string, number> => ({ ...counters });

/** Zeroes every counter. For tests; nothing in the app resets them. */
export const resetWorkCounters = (): void => {
  for (const name of Object.keys(counters)) {
    delete counters[name];
  }
};

// At module scope rather than on the first count, so a realm that did no counted work in an
// interval is distinguishable from one that never loaded the probe.
Object.assign(globalThis, { [WORK_COUNTERS_GLOBAL]: getWorkCounters });
