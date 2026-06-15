//
// Copyright 2024 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Stories are slow to start up.
  timeout: 60_000,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9011 --config-dir=.storybook',
    port: 9011,
    reuseExistingServer: false,
  },
});
