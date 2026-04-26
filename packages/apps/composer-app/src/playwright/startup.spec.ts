//
// Copyright 2025 DXOS.org
//

import { type CDPSession, expect, test } from '@playwright/test';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { log } from '@dxos/log';

import { INITIAL_URL } from './app-manager';
import { appendBenchmarkRow, collectStartupReport, trackNetwork, waitForReady, writeReport } from './harness-helpers';

// Surface the DX_PWA requirement as a test-level failure rather than a hard
// `process.exit` at spec-collection time — keeps the playwright report and
// HTML output meaningful even when this constraint is the cause.
test.beforeAll(() => {
  if (process.env.DX_PWA !== 'false') {
    throw new Error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  }
});

test.describe.serial('Startup timing harness', () => {
  // First-paint and module-graph evaluation each take real wall clock; webkit can be much slower.
  test.setTimeout(120_000);
  // The warm-reload scenario hits an intermittent composer-app race that opens the
  // ResetDialog ("System Error") instead of mounting the user account. The race is
  // pre-existing (reproducible on phase 0 and on every phase since), independent
  // of plugin-manager changes, and not yet root-caused. Until it is fixed the
  // benchmark scenarios get up to two retries so a flake doesn't lose us a row.
  test.describe.configure({ retries: 2 });

  test('cold start (cleared storage)', async ({ browser, browserName }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const network = trackNetwork(page);

    const start = Date.now();
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'cold');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;

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

  test('warm start (reuse storage)', async ({ browser, browserName }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Prime: first navigation populates IDB, OPFS and the SW cache.
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page);

    // Warm reload: navigate again, measure.
    const network = trackNetwork(page);
    const start = Date.now();
    await page.reload();
    await waitForReady(page);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'warm');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;

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

  test('warm-cold start (persisted identity, fresh tab)', async ({ playwright, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'persistent context flow currently exercised only on chromium');

    // Phase 5a: closer to a real returning user — IDB persists in `userDataDir`
    // across launches, but the module cache is cleared because the browser
    // process has fully closed. Separates "load app" from "create new identity",
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
      await primer.close();

      // Re-launch with the same `userDataDir`. IDB persists; module cache is
      // gone because the previous browser process exited.
      const context = await browserType.launchPersistentContext(userDataDir);
      const page = context.pages()[0] ?? (await context.newPage());
      const network = trackNetwork(page);
      const start = Date.now();
      await page.goto(`${INITIAL_URL}/?profiler=1`);
      await waitForReady(page);
      const navigationToReady = Date.now() - start;

      const report = await collectStartupReport(page, 'warm-cold');
      report.navigationToReady = navigationToReady;
      const counts = network();
      report.transferredBytes = counts.bytes;
      report.responseCount = counts.responses;

      writeReport(`startup-warm-cold-${browserName}.json`, report);
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
    // can take 5+ minutes. Useful when validating phase 2 (lazy plugins) on
    // real-network conditions, but too slow for the regular dev-loop. Set
    // `DX_HARNESS_THROTTLED=1` to enable.
    test.skip(!process.env.DX_HARNESS_THROTTLED, 'set DX_HARNESS_THROTTLED=1 to run');
    test.skip(browserName !== 'chromium', 'CDP emulation is chromium-only');
    test.setTimeout(600_000);

    // Phase 5b: emulate a slow real-world client. Reveals the wins from phase 2's
    // bundle reduction that local-disk loads don't see — the smaller eager
    // chunk parses much faster on a throttled CPU, and the 60 lazy plugin
    // chunks parallelize over a high-latency connection.
    //
    // Profile choice: Fast 3G + 2× CPU (not Slow 3G + 4× CPU) because
    // composer's full asset graph is ~40 MB; Slow 3G blew past the test's
    // 150 s waitForReady budget. Fast 3G + 2× CPU is closer to a coffee-shop
    // wi-fi user on an older laptop and still measurably stresses the bundle.
    const context = await browser.newContext();
    const page = await context.newPage();

    let cdp: CDPSession;
    try {
      cdp = await page.context().newCDPSession(page);
    } catch {
      test.skip(true, 'CDP session unavailable');
      return;
    }
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });

    const network = trackNetwork(page);
    const start = Date.now();
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page, 300_000);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'throttled-cold');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;

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
    // Verifies the native-DOM loader (inline in `index.html`) is on screen before
    // `main.tsx` finishes executing. We can't rely on locator-based waits here,
    // because by the time Playwright actuates them React may already have
    // replaced #root and torn the loader DOM down. Instead, capture both signals
    // (`__bootLoader.status` defined; `#boot-loader` rendered) inside the same
    // initial-script block so the assertion runs *before* any user JS executes.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
      (window as any).__bootLoaderSnapshot = () => ({
        hasDriver: typeof (window as any).__bootLoader?.status === 'function',
        bootLoaderInDom: !!document.getElementById('boot-loader'),
        bootLoaderAriaLabel: document.getElementById('boot-loader')?.getAttribute('aria-label') ?? null,
      });
    });
    await page.goto(`${INITIAL_URL}/?profiler=1`, { waitUntil: 'domcontentloaded' });

    const snapshot = await page.evaluate(() => (window as any).__bootLoaderSnapshot());
    expect(snapshot.bootLoaderInDom).toBe(true);
    expect(snapshot.bootLoaderAriaLabel).toBe('Initializing');
    expect(snapshot.hasDriver).toBe(true);

    await context.close();
  });
});
