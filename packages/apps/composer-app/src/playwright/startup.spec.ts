//
// Copyright 2025 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { log } from '@dxos/log';

import { INITIAL_URL } from './app-manager';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

type StartupReport = {
  scenario: 'cold' | 'warm';
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

const REPORT_DIR = path.join(__dirname, '..', '..', '..', '..', '..', 'test-results', 'composer-app');

const writeReport = (name: string, payload: unknown) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(path.join(REPORT_DIR, name), `${JSON.stringify(payload, null, 2)}\n`);
};

const waitForReady = async (page: Page, timeout = 30_000): Promise<void> => {
  await page.getByTestId('treeView.userAccount').waitFor({ timeout });
};

const collectStartupReport = async (page: Page, scenario: StartupReport['scenario']): Promise<StartupReport> => {
  const data = await page.evaluate(() => {
    const profiler = (window as any).composer?.profiler;
    const snapshot = profiler?.snapshot?.() ?? null;
    const paints = performance.getEntriesByType('paint');
    const fp = paints.find((entry) => entry.name === 'first-paint');
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint');
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const bootMark = performance.getEntriesByName('boot:html-parsed')[0];
    return {
      snapshot,
      firstPaint: fp ? Math.round(fp.startTime) : 0,
      firstContentfulPaint: fcp ? Math.round(fcp.startTime) : 0,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
      bootLoaderVisible: bootMark ? Math.round(bootMark.startTime) : null,
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

test.describe('Startup timing harness', () => {
  // First-paint and module-graph evaluation each take real wall clock; webkit can be much slower.
  test.setTimeout(120_000);

  test('cold start (cleared storage)', async ({ browser, browserName }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

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

    const start = Date.now();
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'cold');
    report.navigationToReady = navigationToReady;
    report.transferredBytes = bytes;
    report.responseCount = responses;

    writeReport(`startup-cold-${browserName}.json`, report);
    log.info('cold start report', { browser: browserName, navigationToReady, profilerTotal: report.profilerTotal });

    // Sanity assertions: keep regression-detection cheap. Tighten later as we collect baselines.
    expect(report.firstContentfulPaint).toBeGreaterThan(0);
    expect(report.profilerTotal).toBeGreaterThan(0);
    expect(report.profile.phases.length).toBeGreaterThan(0);

    await testInfo.attach('startup-cold.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });

    await context.close();
  });

  test('warm start (reuse storage)', async ({ browser, browserName }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Prime: first navigation populates IDB, OPFS and the SW cache.
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page);

    // Warm reload: navigate again, measure.
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
        // Ignore.
      }
    });

    const start = Date.now();
    await page.reload();
    await waitForReady(page);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'warm');
    report.navigationToReady = navigationToReady;
    report.transferredBytes = bytes;
    report.responseCount = responses;

    writeReport(`startup-warm-${browserName}.json`, report);
    log.info('warm start report', { browser: browserName, navigationToReady, profilerTotal: report.profilerTotal });

    expect(report.profilerTotal).toBeGreaterThan(0);

    await testInfo.attach('startup-warm.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });

    await context.close();
  });

  test('boot loader paints before bundle is parsed', async ({ browser }) => {
    // Verifies the native-DOM loader (inline in `index.html`) is on screen before
    // `main.tsx` finishes executing. The aria-label is what assistive tech reads.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${INITIAL_URL}/?profiler=1`, { waitUntil: 'commit' });
    const loader = page.locator('#boot-loader');
    await expect(loader).toBeVisible({ timeout: 5_000 });
    await expect(loader).toHaveAttribute('aria-label', 'Initializing');

    // The status driver is installed by an inline script before any module loads.
    const hasDriver = await page.evaluate(() => typeof (window as any).__composerBoot?.status === 'function');
    expect(hasDriver).toBe(true);

    await context.close();
  });
});
