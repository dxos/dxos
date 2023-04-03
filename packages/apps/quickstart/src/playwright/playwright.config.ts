//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: './results',
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  retries: 2,
  reporter: process.env.CI ? [['dot'], ['junit', { outputFile: './results/playwright.xml' }]] : [['list']],
  use: {
    headless: process.env.HEADLESS !== 'false',
    trace: 'on-first-retry'
  },
  webServer: {
    command: process.env.NODE_ENV === 'production' ? 'npm run preview' : 'npm run serve',
    url: process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:4173' : 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
