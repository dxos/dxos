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
  // Two-peer specs boot two app instances per worker, so 4 overloads the cell.
  workers: 3,
  webServer: {
    command: 'pnpm vite preview --configLoader native',
    port: 4173,
    timeout: 300_000,
  },
});
