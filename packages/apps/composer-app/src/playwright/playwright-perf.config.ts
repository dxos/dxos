//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

/**
 * Performance-flow config — `vite preview` over a production bundle, scoped to `perf-*.spec.ts`.
 *
 * Its own config for the reason `playwright-startup.config.ts` has one: these specs record
 * measurements rather than assert behaviour, so they must not ride on `e2e` and spend that job's
 * budget or fail it on a timing flake. It launches no browser of its own — the harness does, since
 * it needs a remote debugging port to reach the shared worker — so the preset's browser projects
 * exist only to satisfy playwright's runner.
 */
export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  testMatch: '**/perf-*.spec.ts',
  // A heavy tier builds 10k tasks through the operation layer before the first stage runs.
  timeout: 1_800_000,
  expect: { timeout: 30_000 },
  workers: 1,
  // Two flows measured at once would contend for the same 4 cores and measure each other.
  fullyParallel: false,
  webServer: {
    command: 'pnpm vite preview --configLoader native',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
