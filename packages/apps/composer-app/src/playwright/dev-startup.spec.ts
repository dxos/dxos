//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { INITIAL_URL } from './app-manager';
import { appendBenchmarkRow, collectStartupReport, trackNetwork, waitForReady, writeReport } from './harness-helpers';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

/**
 * Dev-server startup harness. Run via `playwright-dev.config.ts`, which boots
 * `pnpm vite serve` instead of `pnpm vite preview`.
 *
 * What this measures: the *inner-loop* dev experience — `vite serve` is already
 * running with its `node_modules/.vite` optimize-deps cache primed, and the
 * developer opens a fresh browser tab. The first-ever-`vite-serve` cold-start
 * (where vite must pre-bundle deps from scratch) is intentionally NOT
 * measured here; it's a one-off cost that only happens after a `pnpm install`
 * or a `--force` flush, and folding it into the steady-state number would
 * obscure the day-to-day delta we want to optimize.
 *
 * The single test below primes the dev server with one navigation, then
 * measures a *second* navigation in a brand-new context. That second
 * navigation:
 *
 *   - hits the same dev server (vite cache + module graph warm)
 *   - has a cold browser context (no IDB, no module-script cache)
 *
 * Numbers will look very different from the production preview harness — dev
 * pays per-file transformation cost, no minification, more network requests.
 * Use the BENCHMARKS row's `dev-cold` scenario tag to keep them visually
 * distinct from prod rows.
 */
test.describe.serial('Dev server startup harness', () => {
  test.setTimeout(120_000);

  test('dev cold start (warm vite cache, fresh browser)', async ({ browser, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'dev harness exercised only on chromium for now');

    // Prime: warm Vite's optimize-deps cache and the lazy module graph for
    // composer-app. This first navigation also pays the one-off "discovered new
    // dependency" reload cost (if any) so the measured navigation that follows
    // doesn't include it.
    const primer = await browser.newContext();
    const primerPage = await primer.newPage();
    await primerPage.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(primerPage, 90_000);
    await primer.close();

    // Measured run: brand-new browser context (cold IDB / cold module-script
    // cache) navigating to the still-warm dev server.
    const context = await browser.newContext();
    const page = await context.newPage();
    const network = trackNetwork(page);
    const start = Date.now();
    await page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForReady(page, 90_000);
    const navigationToReady = Date.now() - start;

    const report = await collectStartupReport(page, 'dev-cold');
    report.navigationToReady = navigationToReady;
    const counts = network();
    report.transferredBytes = counts.bytes;
    report.responseCount = counts.responses;

    writeReport(`startup-dev-cold-${browserName}.json`, report);
    appendBenchmarkRow(report);
    log.info('dev cold start report', {
      browser: browserName,
      navigationToReady,
      profilerTotal: report.profilerTotal,
      moduleCount: report.profile.moduleCount,
    });

    expect(report.profilerTotal).toBeGreaterThan(0);
    expect(report.profile.phases.length).toBeGreaterThan(0);

    await testInfo.attach('startup-dev-cold.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    await context.close();
  });
});
