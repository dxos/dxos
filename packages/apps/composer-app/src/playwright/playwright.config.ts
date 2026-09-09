//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Specs this config cannot host: `startup.spec.ts` records benchmark rows rather than asserting
  // behaviour, `dev-*` needs `vite serve` rather than this config's `vite preview`, and
  // `welcome-focus.spec.ts` drives Storybook on :9009. Each has its own config and moon task
  // (`e2e-startup`, `e2e-dev`, `e2e-welcome-focus`).
  testIgnore: ['**/startup.spec.ts', '**/dev-*.spec.ts', '**/welcome-focus.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // No `workers` override: inherits the preset's `PLAYWRIGHT_WORKERS || 2`. This used to hardcode 3,
  // but the two-peer specs boot two app instances per worker, so 3 means six Composer instances at
  // once — and measured with retries off, that produces exactly the starvation the preset's own
  // comment describes: the account panel and space rows never appear inside their 30s budget.
  // Collaboration + HALO at 20x scored 6 failed/80 at three workers and 80/80 at one, same code and
  // run count (DX-1264). Dropping the override also restores `PLAYWRIGHT_WORKERS` tuning for CI,
  // which the hardcoded value disabled.
  webServer: {
    command: 'pnpm vite preview --configLoader native',
    port: 4173,
    timeout: 300_000,
  },
});
