//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // The startup harnesses record benchmark rows rather than assert behaviour, so nothing gates on
  // them; each has its own config and moon task (`e2e-startup`, `e2e-dev`).
  testIgnore: ['**/startup.spec.ts', '**/dev-startup.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  webServer: {
    command: 'pnpm vite preview',
    port: 4173,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
