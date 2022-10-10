//
// Copyright 2022 DXOS.org
//

import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: process.env.HEADLESS !== 'false'
  },
  webServer: {
    command: 'pnpm run dev',
    port: 5173,
    timeout: 30000,
    reuseExistingServer: true
  }
};

export default config;
