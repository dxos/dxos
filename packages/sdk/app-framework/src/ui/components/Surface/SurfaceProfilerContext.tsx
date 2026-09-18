//
// Copyright 2026 DXOS.org
//

import React, {
  type Context,
  type ProfilerOnRenderCallback,
  type PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

const MAX_ENTRIES = 500;

/**
 * Single profiler record captured from React Profiler onRender callback.
 */
export type SurfaceProfilerEntry = {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  timestamp: number;
};

/**
 * Aggregated stats for a single profiled surface.
 */
export type SurfaceProfilerStats = {
  id: string;
  mountCount: number;
  updateCount: number;
  totalRenders: number;
  avgActualDuration: number;
  maxActualDuration: number;
  avgBaseDuration: number;
  lastActualDuration: number;
  lastCommitTime: number;
};

/**
 * Store that collects profiler entries and notifies subscribers.
 */
class SurfaceProfilerStore {
  private _entries: SurfaceProfilerEntry[] = [];
  // Cumulative per-surface stats: the entries buffer is a window, so a surface that rendered before
  // its last MAX_ENTRIES renders would otherwise have no timings at all.
  private _stats = new Map<string, SurfaceProfilerStats>();
  private _listeners = new Set<() => void>();
  private _snapshot: readonly SurfaceProfilerEntry[] = [];
  private _pendingNotify = false;

  /**
   * Records an entry and schedules a deferred notification to avoid re-render loops.
   * `_snapshot` is rebuilt only when the deferred notification actually fires
   * ({@link _notifySync}) — not here — so `getSnapshot` stays referentially stable for any
   * synchronous re-invocation React makes within the same commit (e.g. the tearing check a
   * profiled subscriber's own `useSyncExternalStore` runs right after this Profiler's
   * `onRender` callback). Rebuilding it synchronously here would change what `getSnapshot`
   * returns before listeners are told, which React reads as a torn store and forces an
   * immediate re-render — and if the re-rendering component is itself profiled, that
   * re-render re-triggers `record`, looping forever.
   */
  record(entry: SurfaceProfilerEntry) {
    accumulate(this._stats, entry);
    this._entries.push(entry);
    if (this._entries.length > MAX_ENTRIES) {
      this._entries = this._entries.slice(-MAX_ENTRIES);
    }
    this._scheduleNotify();
  }

  clear() {
    this._entries = [];
    this._stats = new Map();
    this._snapshot = [];
    this._notifySync();
  }

  /** Cumulative stats for every surface that rendered since the last clear, slowest maximum first. */
  getStats(): SurfaceProfilerStats[] {
    return [...this._stats.values()].map((stats) => ({ ...stats })).sort(byMaxDuration);
  }

  subscribe = (listener: () => void) => {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly SurfaceProfilerEntry[] => {
    return this._snapshot;
  };

  /**
   * Defers notification to the next animation frame to break the
   * Profiler onRender → record → notify → re-render → onRender loop.
   */
  private _scheduleNotify() {
    if (!this._pendingNotify) {
      this._pendingNotify = true;
      requestAnimationFrame(() => {
        this._pendingNotify = false;
        this._notifySync();
      });
    }
  }

  private _notifySync() {
    this._snapshot = [...this._entries];
    for (const listener of this._listeners) {
      listener();
    }
  }
}

type SurfaceProfilerContextValue = {
  store: SurfaceProfilerStore;
};

const SurfaceProfilerContext: Context<SurfaceProfilerContextValue | undefined> = createContext<
  SurfaceProfilerContextValue | undefined
>(undefined);

/**
 * Provider that collects React Profiler data from Surface components.
 */
export const SurfaceProfilerProvider = ({ children }: PropsWithChildren) => {
  const storeRef = useRef<SurfaceProfilerStore>(null);
  if (!storeRef.current) {
    storeRef.current = new SurfaceProfilerStore();
  }
  return (
    <SurfaceProfilerContext.Provider value={{ store: storeRef.current }}>{children}</SurfaceProfilerContext.Provider>
  );
};

/**
 * Returns a stable onRender callback for use with React Profiler.
 */
export const useSurfaceProfilerCallback = (): ProfilerOnRenderCallback | undefined => {
  const store = useContext(SurfaceProfilerContext)?.store;
  return useMemo<ProfilerOnRenderCallback | undefined>(() => {
    if (!store) {
      return undefined;
    }
    return (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      store.record({
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        timestamp: Date.now(),
      });
    };
  }, [store]);
};

/**
 * Returns all profiler entries reactively.
 */
export const useSurfaceProfilerEntries = (): readonly SurfaceProfilerEntry[] => {
  const context = useContext(SurfaceProfilerContext);
  return useSyncExternalStore(context?.store.subscribe ?? noop, context?.store.getSnapshot ?? emptySnapshot);
};

/**
 * Reads the cumulative per-surface stats without subscribing: a profiled component that subscribed
 * would record an entry on every re-render the notification caused, and loop. Sample it on a
 * schedule instead.
 */
export const useSurfaceProfilerSnapshot = (): (() => SurfaceProfilerStats[]) => {
  const store = useContext(SurfaceProfilerContext)?.store;
  return useMemo(() => (store ? () => store.getStats() : emptyStats), [store]);
};

/**
 * Returns stats aggregated over the recent-entries window, grouped by surface id.
 */
export const useSurfaceProfilerStats = (): SurfaceProfilerStats[] => {
  const entries = useSurfaceProfilerEntries();
  return aggregateSurfaceProfilerStats(entries);
};

/** Aggregates raw entries into per-surface stats, slowest maximum first. */
export const aggregateSurfaceProfilerStats = (entries: readonly SurfaceProfilerEntry[]): SurfaceProfilerStats[] => {
  const statsMap = new Map<string, SurfaceProfilerStats>();
  for (const entry of entries) {
    accumulate(statsMap, entry);
  }
  return [...statsMap.values()].sort(byMaxDuration);
};

const byMaxDuration = (a: SurfaceProfilerStats, b: SurfaceProfilerStats) => b.maxActualDuration - a.maxActualDuration;

/** Folds one entry into the running stats of its surface. */
const accumulate = (statsMap: Map<string, SurfaceProfilerStats>, entry: SurfaceProfilerEntry) => {
  let stats = statsMap.get(entry.id);
  if (!stats) {
    stats = {
      id: entry.id,
      mountCount: 0,
      updateCount: 0,
      totalRenders: 0,
      avgActualDuration: 0,
      maxActualDuration: 0,
      avgBaseDuration: 0,
      lastActualDuration: 0,
      lastCommitTime: 0,
    };
    statsMap.set(entry.id, stats);
  }

  if (entry.phase === 'mount') {
    stats.mountCount++;
  } else {
    stats.updateCount++;
  }
  stats.totalRenders++;
  stats.avgActualDuration =
    (stats.avgActualDuration * (stats.totalRenders - 1) + entry.actualDuration) / stats.totalRenders;
  stats.avgBaseDuration = (stats.avgBaseDuration * (stats.totalRenders - 1) + entry.baseDuration) / stats.totalRenders;
  stats.maxActualDuration = Math.max(stats.maxActualDuration, entry.actualDuration);
  stats.lastActualDuration = entry.actualDuration;
  stats.lastCommitTime = entry.commitTime;
};

const emptyStats = (): SurfaceProfilerStats[] => [];

/**
 * Clears all collected profiler entries.
 */
export const useSurfaceProfilerClear = (): (() => void) | undefined => {
  const store = useContext(SurfaceProfilerContext)?.store;
  return useMemo(() => (store ? () => store.clear() : undefined), [store]);
};

const noop = () => () => {};
const EMPTY_SNAPSHOT: readonly SurfaceProfilerEntry[] = [];
const emptySnapshot = () => EMPTY_SNAPSHOT;
