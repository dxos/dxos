//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  webServer: {
    command: 'pnpm vite preview',
    port: 4173,
    // `vite preview` serves the prebuilt bundle, so one instance serves every worker; reusing it
    // also means the Knapsack wrapper's per-batch `playwright test` does not pay a fresh boot
    // (measured at ~2.6s per batch) when the previous batch left a server listening.
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
