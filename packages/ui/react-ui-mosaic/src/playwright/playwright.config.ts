//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'moon run storybook-react:serve-e2e -- --port=9008',
    port: 9008,
    reuseExistingServer: false,
  },
});
