//
// Copyright 2026 DXOS.org
//

import { mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { log } from '@dxos/log';

import { INITIAL_URL, waitForAppReady } from './composer';
import { appendBenchmarkRow, collectStartupReport, readNetworkCounts, writeReport } from './harness-helpers';
import { createSession } from './session';

describe('Startup timing harness', () => {
  // First-paint and module-graph evaluation each take real wall clock. No retries: an
  // intermittent boot failure should surface as a failure, not cost a silent re-run.
  const TIMEOUT = 120_000;

  test('cold start (cleared storage)', { timeout: TIMEOUT }, async () => {
    const session = await createSession();
    try {
      const start = Date.now();
      await session.page.goto(`${INITIAL_URL}/?profiler=1`);
      await waitForAppReady(session.page);
      const navigationToReady = Date.now() - start;

      const report = await collectStartupReport(session.page, 'cold');
      report.navigationToReady = navigationToReady;
      const counts = await readNetworkCounts(session.page);
      report.transferredBytes = counts.bytes;
      report.responseCount = counts.responses;

      writeReport('startup-cold-chromium.json', report);
      appendBenchmarkRow(report);
      log.info('cold start report', { navigationToReady, profilerTotal: report.profilerTotal });

      // Sanity assertions: keep regression-detection cheap. Tighten later as we collect baselines.
      expect(report.firstContentfulPaint).toBeGreaterThan(0);
      expect(report.profilerTotal).toBeGreaterThan(0);
      expect(report.profile.phases.length).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  // TODO(wittjosiah): Flaky — under load the 30s `waitForReady` in harness-helpers.ts is too tight.
  //   Either bump that timeout (or pass a longer one through) and re-enable, or move warm-start
  //   benchmarking off the e2e path.
  test.skip('warm start (reuse storage)', { timeout: TIMEOUT }, async () => {
    const session = await createSession();
    try {
      // Prime: first navigation populates IDB, OPFS and the SW cache.
      await session.page.goto(`${INITIAL_URL}/?profiler=1`);
      await waitForAppReady(session.page);

      // Warm reload: navigate again, measure.
      const start = Date.now();
      await session.page.reload();
      await waitForAppReady(session.page);
      const navigationToReady = Date.now() - start;

      const report = await collectStartupReport(session.page, 'warm');
      report.navigationToReady = navigationToReady;
      const counts = await readNetworkCounts(session.page);
      report.transferredBytes = counts.bytes;
      report.responseCount = counts.responses;

      writeReport('startup-warm-chromium.json', report);
      appendBenchmarkRow(report);
      log.info('warm start report', { navigationToReady, profilerTotal: report.profilerTotal });

      expect(report.profilerTotal).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  test('warm-cold start (persisted identity, fresh tab)', { timeout: TIMEOUT }, async () => {
    // Closer to a real returning user — IDB persists in `userDataDir` across
    // launches, but the module cache is cleared because the browser process
    // has fully closed. Separates "load app" from "create new identity",
    // which the regular `cold` scenario conflates.
    const userDataDir = path.join(os.tmpdir(), `composer-harness-${process.pid}-${Date.now()}`);
    // chrome-launcher expects the profile directory to exist.
    mkdirSync(userDataDir, { recursive: true });

    try {
      // Prime: open persistent profile, navigate, wait for ready, close.
      // The OnboardingManager creates a HALO identity which is persisted to IDB.
      const primer = await createSession({ userDataDir });
      await primer.page.goto(`${INITIAL_URL}/?profiler=1`);
      await waitForAppReady(primer.page);
      await primer.close();

      // Re-launch with the same `userDataDir`. IDB persists; module cache is
      // gone because the previous browser process exited.
      const session = await createSession({ userDataDir });
      try {
        const start = Date.now();
        await session.page.goto(`${INITIAL_URL}/?profiler=1`);
        await waitForAppReady(session.page);
        const navigationToReady = Date.now() - start;

        const report = await collectStartupReport(session.page, 'warm-cold');
        report.navigationToReady = navigationToReady;
        const counts = await readNetworkCounts(session.page);
        report.transferredBytes = counts.bytes;
        report.responseCount = counts.responses;

        writeReport('startup-warm-cold-chromium.json', report);
        appendBenchmarkRow(report);
        log.info('warm-cold start report', { navigationToReady, profilerTotal: report.profilerTotal });

        expect(report.profilerTotal).toBeGreaterThan(0);
      } finally {
        await session.close();
      }
    } finally {
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Best effort.
      }
    }
  });

  // Opt-in: composer's full asset graph is ~40 MB, so even Fast 3G + 2× CPU
  // can take 5+ minutes. Useful for validating bundle-size optimizations on
  // real-network conditions, but too slow for the regular dev-loop. Set
  // `DX_HARNESS_THROTTLED=1` to enable.
  test.skipIf(!process.env.DX_HARNESS_THROTTLED)(
    'throttled cold start (Fast 3G + 2× CPU)',
    async () => {
      // Emulate a slow real-world client. Profile is Fast 3G + 2× CPU (not Slow
      // 3G + 4× CPU): composer's full asset graph is ~40 MB and Slow 3G blew
      // past any reasonable `waitForReady` budget. Fast 3G + 2× CPU approximates
      // a coffee-shop wi-fi user on an older laptop and still measurably
      // stresses the bundle.
      const session = await createSession();
      try {
        await session.page.sendCDP('Network.enable');
        await session.page.sendCDP('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: (1.5 * 1024 * 1024) / 8,
          uploadThroughput: (750 * 1024) / 8,
        });
        await session.page.sendCDP('Emulation.setCPUThrottlingRate', { rate: 2 });

        const start = Date.now();
        await session.page.goto(`${INITIAL_URL}/?profiler=1`);
        await waitForAppReady(session.page, 300_000);
        const navigationToReady = Date.now() - start;

        const report = await collectStartupReport(session.page, 'throttled-cold');
        report.navigationToReady = navigationToReady;
        const counts = await readNetworkCounts(session.page);
        report.transferredBytes = counts.bytes;
        report.responseCount = counts.responses;

        writeReport('startup-throttled-cold-chromium.json', report);
        appendBenchmarkRow(report);
        log.info('throttled (Fast 3G + 2× CPU) cold start report', {
          navigationToReady,
          profilerTotal: report.profilerTotal,
        });

        expect(report.profilerTotal).toBeGreaterThan(0);
      } finally {
        await session.close();
      }
    },
  );

  test('boot loader paints before bundle is parsed', { timeout: TIMEOUT }, async () => {
    // Verifies the native-DOM loader (inline in `index.html`) is on screen
    // before `main.tsx` finishes executing. The capture has to happen *at*
    // `DOMContentLoaded` — not later via a locator query — because by the
    // time an automation client would actuate one, React may already have
    // committed its replacement and dismissed the loader. A one-shot listener
    // registered via an init script (which runs before any page script)
    // snapshots the state into `__bootLoaderSnapshot`; the assertion then
    // reads that frozen snapshot, so future timing changes can't quietly
    // turn this into a flake.
    const session = await createSession();
    try {
      await session.page.registerInitScript(`
        (() => {
          const capture = () => {
            window.__bootLoaderSnapshot = {
              hasDriver: typeof window.__bootLoader?.status === 'function',
              bootLoaderInDom: !!document.getElementById('boot-loader'),
              bootLoaderAriaLabel: document.getElementById('boot-loader')?.getAttribute('aria-label') ?? null,
            };
          };
          // DOMContentLoaded already fires once #root and the boot-loader DOM
          // are parsed, but well before React's createRoot.render(...).
          document.addEventListener('DOMContentLoaded', capture, { once: true });
        })();
      `);
      await session.page.goto(`${INITIAL_URL}/?profiler=1`, { waitUntil: 'domcontentloaded' });

      // goto resolves when readyState turns interactive, which can precede the actual
      // DOMContentLoaded dispatch — poll briefly for the frozen snapshot.
      let snapshot: any;
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        snapshot = await session.page.evaluate(() => (window as any).__bootLoaderSnapshot);
        if (snapshot) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      expect(snapshot).toBeTruthy();
      expect(snapshot.bootLoaderInDom).toBe(true);
      expect(snapshot.bootLoaderAriaLabel).toBe('Initializing');
      expect(snapshot.hasDriver).toBe(true);
    } finally {
      await session.close();
    }
  });
});
