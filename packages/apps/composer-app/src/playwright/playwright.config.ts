//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  timeout: 30_000,
  webServer: {
    command: 'moon run composer-app:preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
