//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: __dirname,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['junit', { outputFile: '../test-results.xml' }]],
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
      },
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
      },
    },
  ],
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:5173',
  },
});
