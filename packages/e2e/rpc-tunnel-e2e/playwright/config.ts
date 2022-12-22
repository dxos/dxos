//
// Copyright 2022 DXOS.org
//

import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: process.env.HEADLESS !== 'false'
  },
  webServer: {
    command: 'pnpm -w nx serve rpc-tunnel-e2e',
    port: 5173,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI
  }
};

export default config;
