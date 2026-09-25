//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Every test boots two peers (host + guest) plus a live invitation, so concurrent workers
  // multiply app-boot load past what a runner can serve in time.
  workers: 1,
  // Every test boots two peers (host + guest) plus a live invitation before its body starts.
  timeout: 90_000,
  // Assertions wait on WebRTC replication between the host and guest peers.
  expect: { timeout: 15_000 },
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm vite preview --port=9006',
    port: 9006,
    reuseExistingServer: false,
  },
});
