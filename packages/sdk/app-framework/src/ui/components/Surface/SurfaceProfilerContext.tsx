//
// Copyright 2026 DXOS.org
//

import React, {
  type Context,
  type PropsWithChildren,
  type ProfilerOnRenderCallback,
  createContext,
  useCallback,
  useContext,
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
  private _listeners = new Set<() => void>();
  private _snapshot: readonly SurfaceProfilerEntry[] = [];
  private _pendingNotify = false;

  /** Records an entry and schedules a deferred notification to avoid re-render loops. */
  record(entry: SurfaceProfilerEntry) {
    this._entries.push(entry);
    if (this._entries.length > MAX_ENTRIES) {
      this._entries = this._entries.slice(-MAX_ENTRIES);
    }
    this._snapshot = [...this._entries];
    this._scheduleNotify();
  }

  clear() {
    this._entries = [];
    this._snapshot = [];
    this._notifySync();
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
  const context = useContext(SurfaceProfilerContext);
  return useCallback<ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      context?.store.record({
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        timestamp: Date.now(),
      });
    },
    [context?.store],
  );
};

/**
 * Returns all profiler entries reactively.
 */
export const useSurfaceProfilerEntries = (): readonly SurfaceProfilerEntry[] => {
  const context = useContext(SurfaceProfilerContext);
  return useSyncExternalStore(context?.store.subscribe ?? noop, context?.store.getSnapshot ?? emptySnapshot);
};

/**
 * Returns aggregated stats grouped by surface id.
 */
export const useSurfaceProfilerStats = (): SurfaceProfilerStats[] => {
  const entries = useSurfaceProfilerEntries();
  const statsMap = new Map<string, SurfaceProfilerStats>();

  for (const entry of entries) {
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
    stats.avgBaseDuration =
      (stats.avgBaseDuration * (stats.totalRenders - 1) + entry.baseDuration) / stats.totalRenders;
    stats.maxActualDuration = Math.max(stats.maxActualDuration, entry.actualDuration);
    stats.lastActualDuration = entry.actualDuration;
    stats.lastCommitTime = entry.commitTime;
  }

  return [...statsMap.values()].sort((a, b) => b.maxActualDuration - a.maxActualDuration);
};

/**
 * Clears all collected profiler entries.
 */
export const useSurfaceProfilerClear = (): (() => void) | undefined => {
  const context = useContext(SurfaceProfilerContext);
  return useCallback(() => context?.store.clear(), [context?.store]);
};

const noop = () => () => {};
const emptySnapshot = () => [] as readonly SurfaceProfilerEntry[];
