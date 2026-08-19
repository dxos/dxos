//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

import { UNHOSTABLE_SPECS } from './ignored-specs';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  testIgnore: UNHOSTABLE_SPECS,
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
