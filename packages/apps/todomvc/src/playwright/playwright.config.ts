//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'moon run todomvc:preview -- --port=9006',
    port: 9006,
    reuseExistingServer: false,
  },
});
