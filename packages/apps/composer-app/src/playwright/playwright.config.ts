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
  // Above the preset's 2 but below the refuted 4: two-peer specs boot two app instances per worker,
  // and at 4 workers webkit lost renderers ("browser has been closed") and firefox missed
  // create-space's readiness budget (run 31506532354). 3 is the arm under validation.
  workers: 3,
  webServer: {
    command: 'pnpm vite preview',
    port: 4173,
    timeout: 300_000,
  },
});
