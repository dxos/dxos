//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'pnpm vite dev',
    // Playwright starts the server beside this config; vite needs the package root for its config and HTML.
    cwd: '../..',
    port: 5173,
    reuseExistingServer: false,
  },
});
