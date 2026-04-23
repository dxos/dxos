//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9004 --config-dir=.storybook',
    port: 9004,
    reuseExistingServer: false,
  },
});
