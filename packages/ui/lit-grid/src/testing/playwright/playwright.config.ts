//
// Copyright 2023 DXOS.org
//

import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...nxE2EPreset(import.meta.filename, { testDir: import.meta.dirname }),
  ...e2ePreset(import.meta.dirname),
  webServer: {
    command: 'pnpm -w nx storybook lit-stories',
    port: 9009,
    reuseExistingServer: !process.env.CI,
  },
});
