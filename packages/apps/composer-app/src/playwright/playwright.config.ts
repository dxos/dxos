//
// Copyright 2023 DXOS.org
//

import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...nxE2EPreset(import.meta.filename, { testDir: import.meta.dirname }),
  ...e2ePreset(import.meta.dirname),
  timeout: 30_000,
  repeatEach: 10,
  webServer: {
    command: 'pnpm -w nx preview composer-app',
    port: 4200,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
