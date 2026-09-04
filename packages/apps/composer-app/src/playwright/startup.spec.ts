//
// Copyright 2025 DXOS.org
//

import { type CDPSession, type Page, expect, test } from '@playwright/test';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { INITIAL_URL } from './app-manager';
import {
  appendBenchmarkRow,
  appendRunSample,
  collectStartupReport,
  throttleProfile,
  trackNetwork,
  waitForReady,
  writeReport,
} from './harness-helpers';

// Surface the DX_PWA requirement as a test-level failure rather than a hard
// `process.exit` at spec-collection time — keeps the playwright report and
// HTML output meaningful even when this constraint is the cause.
test.beforeAll(() => {
  if (process.env.DX_PWA !== 'false') {
    throw new Error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  }
});

/**
 * Registers a `longtask` PerformanceObserver before any page script runs — `collectStartupReport`
 * reads the accumulated entries from `window.__longTasks` to compute Total Blocking Time.
 */
const observeLongTasks = (page: Page): Promise<void> =>
  page.addInitScript(() => {
    window.__longTasks = [];
    try {
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__longTasks?.push({ start: entry.startTime, duration: entry.duration });
          }
        }).observe({ type: 'longtask', buffered: true });
      }
    } catch {
      // Long Tasks API unsupported in this browser (firefox/webkit) — `__longTasks` stays empty.
    }
  });

test.describe.serial('Startup timing harness', () => {
  // First-paint and module-graph evaluation each take real wall clock; webkit can be much slower.
  test.setTimeout(120_000);
  // Retries are allowed HERE, unlike the gated suites: this harness never runs in CI (its tasks are
  // manual, outside the `:e2e-ci*` pool) and records benchmark rows rather than gating a merge, so a
  // retry costs a rerun, not a masked defect — and the un-root-caused warm-reload ResetDialog race
  // otherwise throws away a whole sample row.
  test.describe.configure({ retries: 2 });

  test('cold start (cleared storage)', async ({ browser, browserName }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const network = trackNetwork(page);
    await observeLongTasks(page);

    const start = Date.now();
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'cold');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;
    report.fetchedUrls = counts.urls;

    writeReport(`startup-cold-${browserName}.json`, report);
    appendBenchmarkRow(report);
    log.info('cold start report', { browser: browserName, navigationToReady, profilerTotal: report.profilerTotal });

    // Sanity assertions: keep regression-detection cheap. Tighten later as we collect baselines.
    expect(report.firstContentfulPaint).toBeGreaterThan(0);
    expect(report.profilerTotal).toBeGreaterThan(0);
    expect(report.profile.phases.length).toBeGreaterThan(0);

    await testInfo.attach('startup-cold.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    await context.close();
  });

  // TODO(wittjosiah): Flaky — under load the 30s `waitForReady` in harness-helpers.ts is too tight,
  //   and the spec already retries 2x via `test.describe.configure({ retries: 2 })` and still fails.
  //   Either bump that timeout (or pass a longer one through) and re-enable, or move warm-start
  //   benchmarking off the e2e path.
  test.skip('warm start (reuse storage)', async ({ browser, browserName }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Prime: first navigation populates IDB, OPFS and the SW cache.
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page);

    // Warm reload: navigate again, measure.
    const network = trackNetwork(page);
    await observeLongTasks(page);
    const start = Date.now();
    await page.reload();
    await waitForReady(page);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'warm');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;
    report.fetchedUrls = counts.urls;

    writeReport(`startup-warm-${browserName}.json`, report);
    appendBenchmarkRow(report);
    log.info('warm start report', { browser: browserName, navigationToReady, profilerTotal: report.profilerTotal });

    expect(report.profilerTotal).toBeGreaterThan(0);

    await testInfo.attach('startup-warm.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    await context.close();
  });

  // TODO(wittjosiah): Root-cause the warm-reload ResetDialog race ("System Error" opens instead of
  //   the user account mounting); until then the suite's retries contain it.
  test('warm-cold start (persisted identity, fresh tab)', async ({ playwright, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'persistent context flow currently exercised only on chromium');

    // Closer to a real returning user — IDB persists in `userDataDir` across
    // launches, but the module cache is cleared because the browser process
    // has fully closed. Separates "load app" from "create new identity",
    // which the regular `cold` scenario conflates.
    const userDataDir = path.join(os.tmpdir(), `composer-harness-${process.pid}-${Date.now()}`);
    const browserType = playwright[browserName as 'chromium' | 'firefox' | 'webkit'];

    try {
      // Prime: open persistent context, navigate, wait for ready, close.
      // The OnboardingManager creates a HALO identity which is persisted to IDB.
      const primer = await browserType.launchPersistentContext(userDataDir);
      const primerPage = primer.pages()[0] ?? (await primer.newPage());
      await primerPage.goto(`${INITIAL_URL}/?profiler=1`);
      await waitForReady(primerPage);
      // TODO(wittjosiah): Prime an open document (via a robust page-object flow) so the measured
      //   reload restores an editor plank and `milestone:first-editor-interactive` lands here.
      const measuredUrl = new URL(primerPage.url());
      measuredUrl.searchParams.set('profiler', '1');
      await primer.close();

      // Re-launch with the same `userDataDir`. IDB persists; module cache is
      // gone because the previous browser process exited.
      const context = await browserType.launchPersistentContext(userDataDir);
      const page = context.pages()[0] ?? (await context.newPage());
      const network = trackNetwork(page);
      await observeLongTasks(page);
      const start = Date.now();
      await page.goto(measuredUrl.toString());
      await waitForReady(page);
      const navigationToReady = Date.now() - start;
      const report = await collectStartupReport(page, 'warm-cold');
      report.navigationToReady = navigationToReady;
      const counts = network();
      report.transferredBytes = counts.bytes;
      report.responseCount = counts.responses;
      report.fetchedUrls = counts.urls;

      writeReport(`startup-warm-cold-${browserName}.json`, report);
      appendRunSample('warm-cold', report);
      appendBenchmarkRow(report);
      log.info('warm-cold start report', {
        browser: browserName,
        navigationToReady,
        profilerTotal: report.profilerTotal,
      });

      expect(report.profilerTotal).toBeGreaterThan(0);

      await testInfo.attach('startup-warm-cold.json', {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
      });

      await context.close();
    } finally {
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Best effort.
      }
    }
  });

  test('throttled cold start (Fast 3G + 2× CPU)', async ({ browser, browserName }, testInfo) => {
    // Opt-in: composer's full asset graph is ~40 MB, so even Fast 3G + 2× CPU
    // can take 5+ minutes. Useful for validating bundle-size optimizations on
    // real-network conditions, but too slow for the regular dev-loop. Set
    // `DX_HARNESS_THROTTLED=1` to enable.
    test.skip(!process.env.DX_HARNESS_THROTTLED, 'set DX_HARNESS_THROTTLED=1 to run');
    test.skip(browserName !== 'chromium', 'CDP emulation is chromium-only');
    test.setTimeout(600_000);

    // Emulate a slow real-world client. Profile is Fast 3G + 2× CPU (not Slow
    // 3G + 4× CPU): composer's full asset graph is ~40 MB and Slow 3G blew
    // past any reasonable `waitForReady` budget. Fast 3G + 2× CPU approximates
    // a coffee-shop wi-fi user on an older laptop and still measurably
    // stresses the bundle.
    const context = await browser.newContext();
    const page = await context.newPage();

    let cdp: CDPSession;
    try {
      cdp = await page.context().newCDPSession(page);
    } catch {
      test.skip(true, 'CDP session unavailable');
      return;
    }
    // Overridable, since the default Fast 3G profile can outrun `waitForReady`'s 300 s budget.
    const { cpuRate, ...conditions } = throttleProfile();
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...conditions });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
    log.info('throttle profile', { ...conditions, cpuRate });

    const network = trackNetwork(page);
    await observeLongTasks(page);
    const start = Date.now();
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page, 300_000);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'throttled-cold');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;
    report.fetchedUrls = counts.urls;

    writeReport(`startup-throttled-cold-${browserName}.json`, report);
    appendBenchmarkRow(report);
    log.info('throttled (Fast 3G + 2× CPU) cold start report', {
      browser: browserName,
      navigationToReady,
      profilerTotal: report.profilerTotal,
    });

    expect(report.profilerTotal).toBeGreaterThan(0);

    await testInfo.attach('startup-throttled-cold.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    await context.close();
  });

  test('boot loader paints before bundle is parsed', async ({ browser }) => {
    // Verifies the native-DOM loader (inline in `index.html`) is on screen
    // before `main.tsx` finishes executing. The capture has to happen *at*
    // `DOMContentLoaded` — not later via a locator query — because by the
    // time Playwright would actuate one, React may already have committed
    // its replacement and dismissed the loader. We register a one-shot
    // listener inside `addInitScript` (which runs before any page script)
    // that snapshots the state into `__bootLoaderSnapshot`; the assertion
    // then reads that frozen snapshot, so future timing changes can't
    // quietly turn this into a flake.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
      const capture = () => {
        window.__bootLoaderSnapshot = {
          hasDriver: typeof window.__bootLoader?.status === 'function',
          bootLoaderInDom: !!document.getElementById('boot-loader'),
          bootLoaderAriaLabel: document.getElementById('boot-loader')?.getAttribute('aria-label') ?? null,
        };
      };
      // `DOMContentLoaded` already fires once #root and the boot-loader DOM
      // are parsed, but well before React's `createRoot.render(...)`.
      document.addEventListener('DOMContentLoaded', capture, { once: true });
    });
    await page.goto(`${INITIAL_URL}/?profiler=1`, { waitUntil: 'domcontentloaded' });

    const snapshot = await page.evaluate(() => window.__bootLoaderSnapshot);
    // `toBeDefined` rather than `toBeTruthy`: it narrows, so the reads below need no non-null.
    expect(snapshot).toBeDefined();
    invariant(snapshot);
    expect(snapshot.bootLoaderInDom).toBe(true);
    expect(snapshot.bootLoaderAriaLabel).toBe('Initializing');
    expect(snapshot.hasDriver).toBe(true);

    await context.close();
  });
});
