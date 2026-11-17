//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

import { PORT } from './diagram-app.ts';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Each test boots two peers and a live invitation; parallel workers multiply that past what a runner serves in time.
  workers: 1,
  // Presence broadcasts on an interval, so a test waits up to a minute for the peers to see each other.
  timeout: 180_000,
  // Assertions wait on replication between the peers.
  expect: { timeout: 30_000 },
  webServer: {
    command: `pnpm vite preview --port=${PORT}`,
    port: PORT,
    reuseExistingServer: false,
  },
});
