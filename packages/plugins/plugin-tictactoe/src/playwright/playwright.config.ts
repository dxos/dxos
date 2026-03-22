//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  timeout: 60_000,
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9012 --config-dir=.storybook',
    port: 9012,
    reuseExistingServer: false,
  },
});
