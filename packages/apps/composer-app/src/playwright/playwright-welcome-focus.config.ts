//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

/**
 * Storybook harness for Welcome focus regression.
 *
 *   pnpm exec playwright test --config=src/playwright/playwright-welcome-focus.config.ts
 */
export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  testMatch: '**/welcome-focus.spec.ts',
  timeout: 120_000,
  webServer: {
    command: 'pnpm --dir ../../../../../tools/storybook-react exec storybook dev --port 9009 --no-open --ci',
    port: 9009,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
