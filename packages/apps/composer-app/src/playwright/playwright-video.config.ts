//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

const preset = e2ePreset(import.meta.dirname);

export default defineConfig({
  ...preset,
  testMatch: '**/chat.spec.ts',
  workers: 1,
  timeout: 300_000,
  use: {
    ...preset.use,
    video: { mode: 'on', size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'pnpm vite --port 4173 --configLoader native',
    port: 4173,
    reuseExistingServer: true,
    timeout: 600_000,
  },
});
