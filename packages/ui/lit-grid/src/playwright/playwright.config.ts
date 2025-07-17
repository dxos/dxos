//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'moon run lit-storybook:serve-e2e -- --port=9002',
    port: 9002,
    reuseExistingServer: !process.env.CI,
  },
});
