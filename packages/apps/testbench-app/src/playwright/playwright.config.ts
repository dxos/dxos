//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'moon run testbench-app:preview',
    port: 4173,
    reuseExistingServer: false,
  },
});
