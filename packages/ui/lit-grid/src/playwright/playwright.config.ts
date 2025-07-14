//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'moon run lit-stories:serve-e2e',
    port: 8008,
    reuseExistingServer: !!process.env.CI,
  },
});
