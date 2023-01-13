//
// Copyright 2021 DXOS.org
//

import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: process.env.HEADLESS !== 'false'
  },
  webServer: {
    command: 'npm run book',
    port: 8080,
    timeout: 30000,
    reuseExistingServer: !process.env.CI
  }
};

export default config;
