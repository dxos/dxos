//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

// The spec and the served app both require PWA off, and this config exists only to record that run —
// so it sets the flag rather than exiting on a bare invocation that forgot it. Workers and the
// `webServer` command inherit this, as both are spawned after the config loads.
process.env.DX_PWA = 'false';

const preset = e2ePreset(import.meta.dirname);

export default defineConfig({
  ...preset,
  testMatch: '**/assistant-video.spec.ts',
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  webServer: {
    command: 'pnpm vite --port 4173 --configLoader native',
    port: 4173,
    reuseExistingServer: true,
    timeout: 600_000,
  },
});
