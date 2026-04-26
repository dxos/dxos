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
 *   - `throttled-cold`: cold scenario with Slow-3G + 4× CPU emulated via CDP.
 *     Reveals the wins from phase 2's bundle reduction that local-disk loads
 *     don't see. (chromium-only)
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
    eventCount: number;
    moduleCount: number;
    /** Top 10 slowest modules. */
    slowestModules: Array<{ name: string; duration: number }>;
  };
  /** Approximate transferred bytes from network responses (`response_received` events). */
  transferredBytes: number;
  /** Number of network responses received. */
  responseCount: number;
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
 * Hooks `response` to count bytes and responses; the closure returned reads the
 * accumulated counters.
 */
export const trackNetwork = (page: Page): (() => { bytes: number; responses: number }) => {
  let bytes = 0;
  let responses = 0;
  page.on('response', async (response) => {
    responses += 1;
    try {
      const lengthHeader = response.headers()['content-length'];
      if (lengthHeader) {
        bytes += parseInt(lengthHeader, 10) || 0;
      } else {
        const body = await response.body().catch(() => null);
        if (body) {
          bytes += body.byteLength;
        }
      }
    } catch {
      // Ignore — some redirect / preflight responses can't be read.
    }
  });
  return () => ({ bytes, responses });
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
    return {
      snapshot,
      firstPaint: fp ? Math.round(fp.startTime) : 0,
      firstContentfulPaint: fcp ? Math.round(fcp.startTime) : 0,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
      bootLoaderVisible: bootMark ? Math.round(bootMark.startTime) : null,
      firstInteractive: firstInteractiveMark ? Math.round(firstInteractiveMark.startTime) : null,
    };
  });

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
      eventCount: data.snapshot?.events.length ?? 0,
      moduleCount: data.snapshot?.modules.length ?? 0,
      slowestModules: (data.snapshot?.modules ?? []).slice(0, 10).map((entry: any) => ({
        name: entry.name,
        duration: entry.duration,
      })),
    },
    transferredBytes: 0, // populated by caller
    responseCount: 0,
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
  '`top1` = slowest single module activation in this run.',
  '',
  '| timestamp (UTC) | git | dirty | scenario | browser | profilerTotal | navToReady | fcp | bytes (MB) | modules | top1 |',
  '| --- | --- | :---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
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
