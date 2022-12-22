//
// Copyright 2021 DXOS.org
//

import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: process.env.HEADLESS !== 'false'
  },
  webServer: {
    // TODO(wittjosiah): Remove NODE_OPTIONS once storybook is upgraded.
    command: 'NODE_OPTIONS="--openssl-legacy-provider" pnpm -w nx storybook react-client',
    url: 'http://localhost:9009/iframe.html',
    timeout: 300_000,
    reuseExistingServer: !process.env.CI
  }
};

export default config;
