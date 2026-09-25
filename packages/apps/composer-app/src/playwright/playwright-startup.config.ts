//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

/**
 * Production startup harness config — `vite preview`, same as `playwright.config.ts`, but scoped
 * to `startup.spec.ts`.
 *
 * Its own config because the harness records benchmark rows rather than asserting behaviour: we do
 * not gate on it, so it must not ride along on `e2e` and spend that job's budget (or fail it on a
 * timing flake). `playwright.config.ts` correspondingly ignores the spec.
 *
 * Run with:
 *
 *   DX_PWA=false moon run composer-app:e2e-startup
 */
export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  testMatch: '**/startup.spec.ts',
  // Scenario-level timeouts live in the spec; this is the outer bound for the slowest browser.
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 1,
  webServer: {
    command: 'pnpm vite preview --configLoader native',
    port: 4173,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
