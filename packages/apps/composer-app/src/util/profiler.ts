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
  /** Scheduling delay per module (`module-wait:` — in-flight providers + requires resolution). */
  moduleWaits: Array<{ name: string; duration: number; startTime: number }>;
  /** Activate execution per module (`module-run:` — chunk import + body). */
  moduleRuns: Array<{ name: string; duration: number; startTime: number }>;
  /** Lazy chunk import per module (`module-import:` — fetch + parse of the module's chunk). */
  moduleImports: Array<{ name: string; duration: number; startTime: number }>;
  /** Plugin-definition chunk imports (`plugin-load:` — precede all module activation). */
  pluginLoads: Array<{ name: string; duration: number; startTime: number }>;
  /** Which event activated each module (`module-cause:<module>:<event>` marks). */
  moduleCauses: Array<{ module: string; event: string; startTime: number }>;
  /** Graph-builder extension bodies that ran, first run only (`graph-body:<kind>:<id>` marks). */
  graphBodies: Array<{ id: string; kind: string; startTime: number }>;
};

/**
 * Emits a `startup:<name>` performance mark.
 *
 * Unconditional, unlike the {@link Profiler} that reads these back: a mark is a timestamp
 * and a string, and the plugin manager already emits several hundred of them per boot in
 * production (one set per module), so gating these behind the dev-only profiler bought no
 * measurable time and cost every production `composer.startup` its phase timings, which
 * reported 0 because the measures they read never existed.
 */
export const startupMark = (name: string): void => {
  performance.mark(`startup:${name}`);
};

/**
 * Emits a `startup:<name>` measure between two `startup:` marks.
 *
 * `performance.measure` throws when either mark is missing, which a boot path that skipped a
 * phase can legitimately produce; a timing must never take the app down.
 */
export const startupMeasure = (name: string, startMark: string, endMark: string): void => {
  try {
    performance.measure(`startup:${name}`, `startup:${startMark}`, `startup:${endMark}`);
  } catch {
    // Missing mark: the phase never ran.
  }
};

export type Profiler = {
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
  let complete = false;
  let finishedAt: string | undefined;

  const collect = (): ProfilerSnapshot => {
    const measures = performance.getEntriesByType('measure');
    const marks = performance.getEntriesByType('mark');
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
      moduleWaits: measures
        .filter((entry) => entry.name.startsWith('module-wait:'))
        .sort((first, second) => second.duration - first.duration)
        .map((entry) => toRow(entry, 'module-wait:')),
      moduleRuns: measures
        .filter((entry) => entry.name.startsWith('module-run:'))
        .sort((first, second) => second.duration - first.duration)
        .map((entry) => toRow(entry, 'module-run:')),
      moduleImports: measures
        .filter((entry) => entry.name.startsWith('module-import:'))
        .sort((first, second) => second.duration - first.duration)
        .map((entry) => toRow(entry, 'module-import:')),
      pluginLoads: measures
        .filter((entry) => entry.name.startsWith('plugin-load:'))
        .sort((first, second) => second.duration - first.duration)
        .map((entry) => toRow(entry, 'plugin-load:')),
      // Instants, so marks rather than measures. `detail` carries only what the name cannot: a
      // trailing DXN has colons of its own and would be unparseable inside the mark name.
      moduleCauses: marks
        .filter((entry) => entry.name.startsWith('module-cause:'))
        .map((entry) => ({
          module: entry.name.slice('module-cause:'.length),
          event: ((entry as PerformanceMark).detail as { event?: string } | null)?.event ?? '',
          startTime: Math.round(entry.startTime),
        })),
      graphBodies: marks
        .filter((entry) => entry.name.startsWith('graph-body:'))
        .map((entry) => {
          const [kind, ...rest] = entry.name.slice('graph-body:'.length).split(':');
          return { kind, id: rest.join(':'), startTime: Math.round(entry.startTime) };
        }),
    };
  };

  return {
    snapshot: collect,
    dump: () => {
      // The host marks these on both outcomes; only fill in when it has not, so a dev boot does
      // not carry two `startup:ready` marks and two `startup:total` measures.
      if (performance.getEntriesByName('startup:ready').length === 0) {
        startupMark('ready');
        startupMeasure('total', 'main:start', 'ready');
      }
      complete = true;
      finishedAt = new Date().toISOString();

      const snap = collect();

      console.group('Startup Profile');
      console.log('Total startup time:', snap.total, 'ms');
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
