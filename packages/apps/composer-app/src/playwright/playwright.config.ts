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
  webServer: {
    command: 'pnpm vite preview',
    port: 4173,
    // The suite's CI halves are separate Playwright processes sharing :4173 — the second must
    // attach rather than error, which is safe because `vite preview` serves a stateless prebuilt
    // bundle. (With the port free, the command still runs; the flag only governs collisions.)
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
