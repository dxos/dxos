//
// Copyright 2023 DXOS.org
//

import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: __dirname }),
  ...e2ePreset(__dirname),
  webServer: {
    command: 'pnpm -w nx storybook lit-stories',
    port: 9009,
    reuseExistingServer: !process.env.CI,
  },
});
