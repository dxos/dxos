//
// Copyright 2025 DXOS.org
//

/* eslint-disable no-console */

const STORAGE_KEY = 'org.dxos.composer.startup-profile';

/**
 * BroadcastChannel name on which `dump()` publishes the snapshot. A devtools
 * panel or another tab can subscribe to `'message'` events on this channel to
 * receive the JSON snapshot without polling localStorage.
 */
export const BROADCAST_CHANNEL_NAME = STORAGE_KEY;

export type ProfilerSnapshot = {
  /** Wall-clock ms from main:start to ready (or "now" if not yet ready). */
  total: number;
  /** True once `dump()` has finalized the profile. */
  complete: boolean;
  /** ISO timestamp of when `dump()` was called. */
  finishedAt?: string;
  /** Top-level startup phases (`startup:dynamic-imports`, `startup:services`, …). */
  phases: Array<{ name: string; duration: number; startTime: number }>;
  /** Activation-event timings (`event:foo:bar`). */
  events: Array<{ name: string; duration: number; startTime: number }>;
  /** Module activation timings (`module:org.dxos.plugin.x.module.y`). */
  modules: Array<{ name: string; duration: number; startTime: number }>;
  /**
   * Cross-cutting service marks emitted outside the profiler's prefixes
   * (worker spawn/session, client init) — decomposes the Client module time.
   */
  services: Array<{ name: string; duration: number; startTime: number }>;
  /** Per-plugin lazy chunk resolve timings (`lazy:<plugin id>`). */
  lazyPlugins: Array<{ name: string; duration: number; startTime: number }>;
  /** Main-thread blocks ≥50ms (Long Tasks API) — what actually starves paint. */
  longTasks: { count: number; totalMs: number; top: Array<{ duration: number; startTime: number }> };
};

export type Profiler = {
  mark: (name: string) => void;
  measure: (name: string, startMark: string, endMark: string) => void;
  /** Returns a JSON snapshot of timings (works before or after `dump`). */
  snapshot: () => ProfilerSnapshot;
  /** Finalizes the profile, logs to console, persists to localStorage. */
  dump: () => void;
};

/**
 * Collects performance marks/measures from plugin-manager and dumps a startup timeline.
 * Tree-shaken in production when VITE_DEBUG is not set.
 */
export const startupProfiler = (): Profiler => {
  performance.mark('startup:main:start');
  // Everything before main() — HTML parse, module-graph fetch/eval (and vite
  // transforms in dev). The largest uninstrumented slice on cold dev loads.
  performance.measure('startup:pre-main', undefined, 'startup:main:start');

  let complete = false;
  let finishedAt: string | undefined;

  // Long tasks starve paint (and the boot loader's status updates); record them
  // for the snapshot. `buffered: true` back-fills tasks from before this call.
  const longTasks: Array<{ duration: number; startTime: number }> = [];
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({ duration: Math.round(entry.duration), startTime: Math.round(entry.startTime) });
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // Long Tasks API unavailable (firefox/safari) — snapshot reports zero.
  }

  // Marks/measures emitted by @dxos/client and the worker framework that don't
  // share the profiler's prefixes. Point marks become zero-duration rows; the
  // spawn→ready pair is synthesized into a duration.
  const collectServices = (): ProfilerSnapshot['services'] => {
    const rows: ProfilerSnapshot['services'] = [];
    const measure = performance.getEntriesByName('client.initialize', 'measure')[0];
    if (measure) {
      rows.push({
        name: 'client.initialize',
        duration: Math.round(measure.duration),
        startTime: Math.round(measure.startTime),
      });
    }
    const spawned = performance.getEntriesByName('worker-connection:spawned', 'mark')[0];
    const sessionReady = performance.getEntriesByName('worker-connection:session-ready', 'mark')[0];
    if (spawned && sessionReady) {
      rows.push({
        name: 'worker-connection:spawn→session-ready',
        duration: Math.round(sessionReady.startTime - spawned.startTime),
        startTime: Math.round(spawned.startTime),
      });
    }
    for (const mark of ['dedicated-worker:session-ready', 'boot:html-parsed']) {
      const entry = performance.getEntriesByName(mark, 'mark')[0];
      if (entry) {
        rows.push({ name: mark, duration: 0, startTime: Math.round(entry.startTime) });
      }
    }
    return rows.sort((first, second) => first.startTime - second.startTime);
  };

  const collect = (): ProfilerSnapshot => {
    const measures = performance.getEntriesByType('measure');
    const totalEntry = measures
      .slice()
      .reverse()
      .find((entry) => entry.name === 'startup:total');
    const total = totalEntry
      ? Math.round(totalEntry.duration)
      : Math.round(performance.now() - (performance.getEntriesByName('startup:main:start')[0]?.startTime ?? 0));

    const toRow = (entry: PerformanceEntry, prefix: string) => ({
      name: entry.name.replace(prefix, ''),
      duration: Math.round(entry.duration),
      startTime: Math.round(entry.startTime),
    });

    return {
      total,
      complete,
      finishedAt,
      phases: measures
        .filter((entry) => entry.name.startsWith('startup:'))
        .sort((first, second) => first.startTime - second.startTime)
        .map((entry) => toRow(entry, 'startup:')),
      events: measures
        .filter((entry) => entry.name.startsWith('event:'))
        .sort((first, second) => first.startTime - second.startTime)
        .map((entry) => toRow(entry, 'event:')),
      modules: measures
        .filter((entry) => entry.name.startsWith('module:'))
        .sort((first, second) => second.duration - first.duration)
        .map((entry) => toRow(entry, 'module:')),
      services: collectServices(),
      lazyPlugins: measures
        .filter((entry) => entry.name.startsWith('lazy:'))
        .sort((first, second) => second.duration - first.duration)
        .map((entry) => toRow(entry, 'lazy:')),
      longTasks: {
        count: longTasks.length,
        totalMs: longTasks.reduce((sum, task) => sum + task.duration, 0),
        top: longTasks
          .slice()
          .sort((first, second) => second.duration - first.duration)
          .slice(0, 10),
      },
    };
  };

  return {
    mark: (name: string) => performance.mark(`startup:${name}`),
    measure: (name: string, startMark: string, endMark: string) =>
      performance.measure(`startup:${name}`, `startup:${startMark}`, `startup:${endMark}`),
    snapshot: collect,
    dump: () => {
      performance.mark('startup:ready');
      performance.measure('startup:total', 'startup:main:start', 'startup:ready');
      complete = true;
      finishedAt = new Date().toISOString();

      const snap = collect();

      console.group('Startup Profile');
      console.log('Total startup time:', snap.total, 'ms');
      console.log('Long tasks:', snap.longTasks.count, `(${snap.longTasks.totalMs} ms blocked)`);
      console.table(
        snap.phases.map((entry) => ({
          'Phase': entry.name,
          'Duration (ms)': entry.duration,
          'Start (ms)': entry.startTime,
        })),
      );
      console.log(`\nActivation Events (${snap.events.length}):`);
      console.table(
        snap.events.map((entry) => ({
          'Event': entry.name,
          'Duration (ms)': entry.duration,
          'Start (ms)': entry.startTime,
        })),
      );
      console.log(`\nServices (${snap.services.length}):`);
      console.table(
        snap.services.map((entry) => ({
          'Mark': entry.name,
          'Duration (ms)': entry.duration,
          'Start (ms)': entry.startTime,
        })),
      );
      console.log(`\nSlowest Modules (top 20 of ${snap.modules.length}):`);
      console.table(
        snap.modules.slice(0, 20).map((entry) => ({
          'Module': entry.name,
          'Duration (ms)': entry.duration,
          'Start (ms)': entry.startTime,
        })),
      );
      console.groupEnd();

      // Publish the snapshot on a BroadcastChannel so a devtools panel or
      // another tab can subscribe without polling localStorage. Best-effort —
      // `BroadcastChannel` is missing in some embedded webviews.
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
          channel.postMessage(snap);
          channel.close();
        }
      } catch {
        // No-op — channel publishing is purely additive.
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      } catch {
        // Quota or disabled storage — non-fatal.
      }
    },
  };
};
