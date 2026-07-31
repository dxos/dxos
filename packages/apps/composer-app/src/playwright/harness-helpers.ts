//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `__dirname` is not defined in ESM; derive from `import.meta.url`.
export const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Boot scenarios captured by the harness. New scenarios should add a doc-line here
 * and a column-friendly tag (kebab-case is fine for the BENCHMARKS row).
 *
 *   - `cold`: fresh browser context, no IDB, no module cache. First-ever-user
 *     experience; conflates "load app" with "create new identity from scratch".
 *   - `warm`: same context as cold, then `page.reload()`. Returning user in
 *     a still-running tab — IDB and bundle cache are warm.
 *   - `warm-cold`: persistent context primed once, closed, then re-launched.
 *     IDB persists across launches but module cache is fresh — closest to a
 *     real returning user opening Composer in a new tab. (chromium-only)
 *   - `throttled-cold`: cold scenario with Fast 3G + 2× CPU emulated via CDP.
 *     Reveals bundle-size wins that local-disk loads don't expose. (chromium-only)
 *   - `dev-cold`: vite dev server, fresh browser context, but with the vite
 *     optimize-deps cache and module graph already primed by a previous
 *     navigation in the same `vite serve` process. Measures the inner-loop
 *     "edit-and-reload" experience, not the cold `vite serve` start.
 */
export type Scenario = 'cold' | 'warm' | 'warm-cold' | 'throttled-cold' | 'dev-cold';

export type StartupReport = {
  scenario: Scenario;
  url: string;
  /** ms from `navigationStart` to first paint. */
  firstPaint: number;
  /** ms from `navigationStart` to first contentful paint. */
  firstContentfulPaint: number;
  /** ms from `navigationStart` to `domContentLoaded`. */
  domContentLoaded: number;
  /** Time the boot loader (native HTML/CSS) became visible. */
  bootLoaderVisible: number | null;
  /** Total ms reported by `composer.profiler` (main:start → ready). */
  profilerTotal: number;
  /** Time the React Placeholder is dismissed and `<App>` first commits the real shell (`app-framework:first-interactive`). */
  firstInteractive: number | null;
  /** Wall-clock ms from `page.goto` until the user-account testid was visible. */
  navigationToReady: number;
  /** Phase, event, and module timings sourced from `composer.profiler.snapshot()`. */
  profile: {
    phases: Array<{ name: string; duration: number; startTime: number }>;
    events: Array<{ name: string; duration: number; startTime: number }>;
    eventCount: number;
    moduleCount: number;
    /** Top 10 slowest modules. */
    slowestModules: Array<{ name: string; duration: number }>;
    /** Every module activation with the wait (scheduling) / run (activate) / import (chunk) split. */
    modules: Array<{
      name: string;
      startTime: number;
      duration: number;
      wait: number | null;
      run: number | null;
      import: number | null;
    }>;
    /** Plugin-definition chunk imports (precede all module activation). */
    pluginLoads: Array<{ name: string; duration: number; startTime: number }>;
  };
  /**
   * Static module inventory probed from `composer.manager.getModules()` — the classification
   * axes (mode, event gate, requires/provides) for joining against the timing data.
   */
  inventory: Array<{
    id: string;
    mode: string;
    activatesOn: string[] | null;
    requires: string[];
    provides: string[];
  }> | null;
  /** Per-URL resource timings (scripts/css/wasm fetched before the report was taken). */
  resources: Array<{
    name: string;
    initiatorType: string;
    startTime: number;
    duration: number;
    transferSize: number;
    encodedBodySize: number;
    decodedBodySize: number;
  }>;
  /** Approximate transferred bytes from network responses (`response_received` events). */
  transferredBytes: number;
  /** Number of network responses received. */
  responseCount: number;
  /** Complete per-URL byte accounting from `trackNetwork` (immune to the resource-timing buffer cap). */
  fetchedUrls: Array<{ url: string; bytes: number }>;
  /** Total Blocking Time (Lighthouse definition): sum of `duration - 50ms` for long tasks starting after first contentful paint; our trace ends at collection time. */
  tbt: number;
  /** Raw Long Tasks API stats over the page's lifetime so far (not gated to the FCP→end window `tbt` uses). */
  longTasks: { count: number; max: number; total: number };
  /** Stitched boot waterfall — named marks/measures sorted by start, ms relative to `navigationStart`. */
  waterfall: Array<{ name: string; start: number; end?: number }>;
};

const REPORT_DIR = path.join(here, '..', '..', '..', '..', '..', 'test-results', 'composer-app');

export const writeReport = (name: string, payload: unknown): void => {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(path.join(REPORT_DIR, name), `${JSON.stringify(payload, null, 2)}\n`);
};

export const waitForReady = async (page: Page, timeout = 30_000): Promise<void> => {
  await page.getByTestId('treeView.userAccount').waitFor({ timeout });
};

/**
 * Hooks `response` to count bytes and responses; the closure returned reads the accumulated
 * counters. Tracked node-side (not via the page's resource-timing entries, whose default
 * 250-entry buffer silently truncates composer's several-hundred-chunk startup), so the per-URL
 * list is complete for byte attribution.
 */
export const trackNetwork = (
  page: Page,
): (() => { bytes: number; responses: number; urls: Array<{ url: string; bytes: number }> }) => {
  let bytes = 0;
  let responses = 0;
  const urls: Array<{ url: string; bytes: number }> = [];
  page.on('response', async (response) => {
    responses += 1;
    try {
      const lengthHeader = response.headers()['content-length'];
      let size = 0;
      if (lengthHeader) {
        size = parseInt(lengthHeader, 10) || 0;
      } else {
        const body = await response.body().catch(() => null);
        if (body) {
          size = body.byteLength;
        }
      }
      bytes += size;
      urls.push({ url: response.url(), bytes: size });
    } catch {
      // Ignore — some redirect / preflight responses can't be read.
    }
  });
  return () => ({ bytes, responses, urls });
};

export const collectStartupReport = async (page: Page, scenario: Scenario): Promise<StartupReport> => {
  const data = await page.evaluate(() => {
    const profiler = (window as any).composer?.profiler;
    const snapshot = profiler?.snapshot?.() ?? null;
    const paints = performance.getEntriesByType('paint');
    const fp = paints.find((entry) => entry.name === 'first-paint');
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint');
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const bootMark = performance.getEntriesByName('boot:html-parsed')[0];
    const firstInteractiveMark = performance.getEntriesByName('app-framework:first-interactive')[0];

    // Static inventory — the classification axes for joining against the timing data. Guarded:
    // the manager global appears only after React mounts, and its shape is framework-internal.
    let inventory: unknown = null;
    try {
      const manager = (globalThis as any).composer?.manager;
      const modules = manager?.getModules?.();
      if (Array.isArray(modules)) {
        const eventKeyOf = (event: any): string =>
          `${String(event?.id ?? '?')}${event?.specifier ? `:${String(event.specifier)}` : ''}`;
        inventory = modules.map((module: any) => {
          const spec = module.activation ?? {};
          const activatesOn = spec.activatesOn
            ? 'type' in spec.activatesOn
              ? spec.activatesOn.events.map(eventKeyOf)
              : [eventKeyOf(spec.activatesOn)]
            : null;
          return {
            id: String(module.id),
            mode: String(spec.mode ?? 'unknown'),
            activatesOn,
            requires: (spec.requires ?? []).map((tag: any) => `${String(tag.identifier)}#${String(tag.arity)}`),
            provides: (spec.provides ?? []).map((tag: any) => `${String(tag.identifier)}#${String(tag.arity)}`),
          };
        });
      }
    } catch {
      // Best-effort — the report is still useful without the inventory.
    }

    const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      startTime: Math.round(entry.startTime),
      duration: Math.round(entry.duration),
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
    }));

    // Populated by the `addInitScript`-registered PerformanceObserver; absent (falls back to `[]`)
    // on browsers without Long Tasks API support.
    const longTasks = ((window as any).__longTasks ?? []) as Array<{ start: number; duration: number }>;
    const fcpStart = fcp ? fcp.startTime : 0;
    const tbt = longTasks
      .filter((task) => task.start > fcpStart)
      .reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
    const longTaskStats = {
      count: longTasks.length,
      max: longTasks.length ? Math.max(...longTasks.map((task) => task.duration)) : 0,
      total: longTasks.reduce((sum, task) => sum + task.duration, 0),
    };

    // `main:start` is looked up under both names since the profiler namespaces its marks under `startup:`.
    const mainStartMark =
      performance.getEntriesByName('main:start')[0] ?? performance.getEntriesByName('startup:main:start')[0];
    const eventMeasures = performance.getEntriesByType('measure').filter((entry) => entry.name.startsWith('event:'));
    // `client.initialize:*` marks come from the @dxos/client SDK — the longest single block
    // on the boot critical path; picked up alongside the app-level milestones.
    const milestoneMarks = performance
      .getEntriesByType('mark')
      .filter((entry) => entry.name.startsWith('milestone:') || entry.name.startsWith('client.initialize:'));

    const waterfall: Array<{ name: string; start: number; end?: number }> = [{ name: 'navigationStart', start: 0 }];
    if (nav) {
      waterfall.push({ name: 'TTFB', start: nav.responseStart });
    }
    if (nav) {
      waterfall.push({ name: 'domContentLoaded', start: nav.domContentLoadedEventEnd });
    }
    if (bootMark) {
      waterfall.push({ name: 'boot:html-parsed', start: bootMark.startTime });
    }
    if (fp) {
      waterfall.push({ name: 'first-paint', start: fp.startTime });
    }
    if (fcp) {
      waterfall.push({ name: 'first-contentful-paint', start: fcp.startTime });
    }
    if (mainStartMark) {
      waterfall.push({ name: 'main:start', start: mainStartMark.startTime });
    }
    for (const entry of eventMeasures) {
      waterfall.push({ name: entry.name, start: entry.startTime, end: entry.startTime + entry.duration });
    }
    if (firstInteractiveMark) {
      waterfall.push({ name: 'app-framework:first-interactive', start: firstInteractiveMark.startTime });
    }
    for (const entry of milestoneMarks) {
      waterfall.push({ name: entry.name, start: entry.startTime });
    }
    waterfall.sort((first, second) => first.start - second.start);

    return {
      snapshot,
      inventory,
      resources,
      firstPaint: fp ? Math.round(fp.startTime) : 0,
      firstContentfulPaint: fcp ? Math.round(fcp.startTime) : 0,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
      bootLoaderVisible: bootMark ? Math.round(bootMark.startTime) : null,
      firstInteractive: firstInteractiveMark ? Math.round(firstInteractiveMark.startTime) : null,
      tbt: Math.round(tbt),
      longTasks: longTaskStats,
      waterfall,
    };
  });

  // Join the wait/run/import sub-measures onto each module row by name.
  const indexByName = (rows: Array<{ name: string; duration: number }> | undefined) =>
    new Map((rows ?? []).map((row) => [row.name, row.duration]));
  const waits = indexByName(data.snapshot?.moduleWaits);
  const runs = indexByName(data.snapshot?.moduleRuns);
  const imports = indexByName(data.snapshot?.moduleImports);
  const modules = (data.snapshot?.modules ?? []).map((entry: any) => ({
    name: entry.name,
    startTime: entry.startTime,
    duration: entry.duration,
    wait: waits.get(entry.name) ?? null,
    run: runs.get(entry.name) ?? null,
    import: imports.get(entry.name) ?? null,
  }));

  return {
    scenario,
    url: page.url(),
    firstPaint: data.firstPaint,
    firstContentfulPaint: data.firstContentfulPaint,
    domContentLoaded: data.domContentLoaded,
    bootLoaderVisible: data.bootLoaderVisible,
    profilerTotal: data.snapshot?.total ?? 0,
    firstInteractive: data.firstInteractive,
    navigationToReady: 0, // overwritten by caller
    profile: {
      phases: data.snapshot?.phases ?? [],
      events: data.snapshot?.events ?? [],
      eventCount: data.snapshot?.events.length ?? 0,
      moduleCount: data.snapshot?.modules.length ?? 0,
      slowestModules: (data.snapshot?.modules ?? []).slice(0, 10).map((entry: any) => ({
        name: entry.name,
        duration: entry.duration,
      })),
      modules,
      pluginLoads: data.snapshot?.pluginLoads ?? [],
    },
    inventory: data.inventory as StartupReport['inventory'],
    resources: data.resources,
    transferredBytes: 0, // populated by caller
    responseCount: 0,
    fetchedUrls: [], // populated by caller
    tbt: data.tbt,
    longTasks: data.longTasks,
    waterfall: data.waterfall,
  };
};

/**
 * Path to the human-readable benchmark ledger committed in the package root.
 * Each harness run appends one row per scenario.
 */
const BENCHMARKS_FILE = path.join(here, '..', '..', 'BENCHMARKS.md');

const BENCHMARKS_HEADER = [
  '# Composer-app startup benchmarks',
  '',
  'Auto-recorded by `src/playwright/startup.spec.ts` (production preview) and ',
  '`src/playwright/dev-startup.spec.ts` (vite dev). One row per scenario per harness run.',
  '`profilerTotal` = `composer.profiler` (`main:start` → `Startup` activated).',
  '`navToReady` = wall-clock from `page.goto` until the user-account testid is visible.',
  '`fcp` = first contentful paint (the boot loader). `bytes` = sum of response bodies.',
  '`tbtMs` = Total Blocking Time (Lighthouse definition, FCP → trace end).',
  '`top1` = slowest single module activation in this run.',
  '',
  '| timestamp (UTC) | git | dirty | scenario | browser | profilerTotal | navToReady | fcp | tbtMs | bytes (MB) | modules | top1 |',
  '| --- | --- | :---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  '',
].join('\n');

const gitContext = (): { sha: string; dirty: boolean } => {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim();
    const status = execSync('git status --porcelain', { cwd: here }).toString().trim();
    return { sha, dirty: status.length > 0 };
  } catch {
    return { sha: '?', dirty: false };
  }
};

const formatBenchmarkRow = (report: StartupReport): string => {
  const top = report.profile.slowestModules[0];
  const topLabel = top ? `\`${top.name}\` (${top.duration})` : '—';
  const { sha, dirty } = gitContext();
  return [
    new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    sha,
    dirty ? '⚠' : '',
    report.scenario,
    process.env.PLAYWRIGHT_BROWSER || 'chromium',
    report.profilerTotal,
    report.navigationToReady,
    report.firstContentfulPaint,
    report.tbt,
    (report.transferredBytes / 1024 / 1024).toFixed(1),
    report.profile.moduleCount,
    topLabel,
  ]
    .map((value) => `${value}`)
    .join(' | ');
};

export const appendBenchmarkRow = (report: StartupReport): void => {
  if (!existsSync(BENCHMARKS_FILE)) {
    writeFileSync(BENCHMARKS_FILE, BENCHMARKS_HEADER);
  }
  const existing = readFileSync(BENCHMARKS_FILE, 'utf8');
  // Re-create header if a previous version is missing the new columns.
  const body = existing.startsWith('# Composer-app startup benchmarks') ? existing : BENCHMARKS_HEADER;
  writeFileSync(BENCHMARKS_FILE, `${body.trimEnd()}\n| ${formatBenchmarkRow(report)} |\n`);
};
