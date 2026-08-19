//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

import { NON_PRODUCTION_SET_SPECS, UNHOSTABLE_SPECS } from './ignored-specs';

/**
 * The e2e suite against a build of the curated production plugin set (`DX_PLUGIN_SET=production`),
 * rather than the full catalog `playwright.config.ts` serves. Same specs and the same `vite preview`;
 * what differs is the bundle under them, which is the point — a plugin the set omits and a spec still
 * needs fails here rather than after a deploy.
 *
 * Run with:
 *
 *   moon run composer-app:e2e-production
 */
export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  testIgnore: [...UNHOSTABLE_SPECS, ...NON_PRODUCTION_SET_SPECS],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Two-peer specs boot two app instances per worker, so 4 overloads the cell.
  workers: 3,
  webServer: {
    command: 'pnpm vite preview',
    port: 4173,
    timeout: 300_000,
  },
});
