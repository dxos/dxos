//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { log } from '@dxos/log';

import { INITIAL_URL, waitForAppReady } from './composer';
import { appendBenchmarkRow, collectStartupReport, readNetworkCounts, writeReport } from './harness-helpers';
import { createSession } from './session';

/**
 * Dev-server startup harness. Run via `vitest.dev.config.ts`, which boots
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
 * measures a *second* navigation in a brand-new browser. That second
 * navigation:
 *
 *   - hits the same dev server (vite cache + module graph warm)
 *   - has a cold browser profile (no IDB, no module-script cache)
 *
 * Numbers will look very different from the production preview harness — dev
 * pays per-file transformation cost, no minification, more network requests.
 * Use the BENCHMARKS row's `dev-cold` scenario tag to keep them visually
 * distinct from prod rows.
 */
describe('Dev server startup harness', () => {
  test('dev cold start (warm vite cache, fresh browser)', async () => {
    // Prime: warm Vite's optimize-deps cache and the lazy module graph for
    // composer-app. This first navigation also pays the one-off "discovered new
    // dependency" reload cost (if any) so the measured navigation that follows
    // doesn't include it.
    const primer = await createSession();
    await primer.page.goto(`${INITIAL_URL}/?profiler=1`);
    await waitForAppReady(primer.page, 90_000);
    await primer.close();

    // Measured run: brand-new browser (cold IDB / cold module-script cache)
    // navigating to the still-warm dev server.
    const session = await createSession();
    try {
      const start = Date.now();
      await session.page.goto(`${INITIAL_URL}/?profiler=1`);
      await waitForAppReady(session.page, 90_000);
      const navigationToReady = Date.now() - start;

      const report = await collectStartupReport(session.page, 'dev-cold');
      report.navigationToReady = navigationToReady;
      const counts = await readNetworkCounts(session.page);
      report.transferredBytes = counts.bytes;
      report.responseCount = counts.responses;

      writeReport('startup-dev-cold-chromium.json', report);
      appendBenchmarkRow(report);
      log.info('dev cold start report', {
        navigationToReady,
        profilerTotal: report.profilerTotal,
        moduleCount: report.profile.moduleCount,
      });

      expect(report.profilerTotal).toBeGreaterThan(0);
      expect(report.profile.phases.length).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });
});
