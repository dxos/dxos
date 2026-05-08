//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Drop once pragmatic-dnd flake is fully sorted.
  retries: process.env.CI ? 2 : 0,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9008 --config-dir=.storybook',
    port: 9008,
    reuseExistingServer: false,
  },
});
