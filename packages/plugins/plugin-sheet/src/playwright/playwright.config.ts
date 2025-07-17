//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'moon run storybook:serve-e2e -- --port=9005',
    port: 9005,
    reuseExistingServer: !process.env.CI,
  },
});
