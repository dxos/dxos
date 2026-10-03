//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

import { PERF_PORT } from './perf/server.ts';

/**
 * Performance-flow config — `vite preview` over a production bundle, scoped to `perf-*.spec.ts`.
 *
 * Its own config for the reason `playwright-startup.config.ts` has one: these specs record
 * measurements rather than assert behaviour, so they must not ride on `e2e` and spend that job's
 * budget or fail it on a timing flake. It launches no browser of its own — the harness does, since
 * it needs a remote debugging port to reach the shared worker.
 *
 * PINNED TO ONE PROJECT. The preset selects all three browsers when `CI` is set, and a project here
 * is only a vehicle for the runner: the harness launches its own instrumented Chromium whichever
 * project is active, so `firefox` and `webkit` would run the same Chromium two more times. That is
 * not a slower run, it is a wrong one — the three share a `dedup` key, so their PostHog events
 * resolve onto one uuid and two of the three silently overwrite the rows of the other.
 *
 * Filtered from the preset's own list rather than declared fresh, to keep the cloud sandbox's
 * pinned executable and proxy args that `chromium` carries there.
 */
const preset = e2ePreset(import.meta.dirname);

export default defineConfig({
  ...preset,
  projects: preset.projects?.filter((project) => project.name === 'chromium'),
  testMatch: '**/perf-*.spec.ts',
  // TRACING OFF, unlike every other config here: `retain-on-failure` still RECORDS, and the
  // recorder's DOM snapshotter runs on the page's main thread — ~960 ms of the `reopen-project`
  // stage on the 94k-node task list, a third of that stage's measured TBT, spent by the instrument
  // rather than the app. Nothing is lost: these specs assert nothing, and the harness writes its
  // own `.cpuprofile` and stills to read a regression with.
  use: { ...preset.use, trace: 'off' },
  // No config-level bound: the spec derives the budget from the measured fixture cost and sets it
  // per test, which overrides this value anyway, so a number here would only mislead about which
  // limit applies. A config expiry also reports no stage at all — the one failure that explains
  // nothing.
  timeout: 0,
  expect: { timeout: 30_000 },
  workers: 1,
  // Two flows measured at once would contend for the same 4 cores and measure each other.
  fullyParallel: false,
  webServer: {
    command: `pnpm vite preview --configLoader native${PERF_PORT ? ` --port ${PERF_PORT} --strictPort` : ''}`,
    port: PERF_PORT ?? 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
