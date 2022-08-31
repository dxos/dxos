//
// Copyright 2022 DXOS.org
//

import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: !!process.env.CI || !!process.env.HEADLESS
  },
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    timeout: 30000,
    reuseExistingServer: !process.env.CI
  }
};

export default config;
