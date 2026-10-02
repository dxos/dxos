//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

const preset = e2ePreset(import.meta.dirname);

/**
 * Chat performance flow against the Storybook chat story, measured by `@dxos/perf-harness`.
 *
 * Pinned to one project because the harness launches its own instrumented Chromium whichever
 * project is active, so the other browsers would only rerun the same Chromium.
 */
export default defineConfig({
  ...preset,
  projects: preset.projects?.filter((project) => project.name === 'chromium'),
  testMatch: '**/perf-*.spec.ts',
  // Playwright's recorder snapshots the DOM on the page's main thread, which lands inside the stages.
  use: { ...preset.use, trace: 'off', video: 'off', screenshot: 'off' },
  timeout: 0,
  expect: { timeout: 30_000 },
  workers: 1,
  // Two flows measured at once would contend for the same cores and measure each other.
  fullyParallel: false,
  webServer: {
    command: 'pnpm --dir ../../../../../tools/storybook-react exec storybook dev --port 9009 --no-open --ci',
    port: 9009,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
