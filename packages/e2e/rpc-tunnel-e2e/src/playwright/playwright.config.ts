//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  webServer: {
    // TODO(wittjosiah): Using vite directly to avoid moon re-building things.
    command: 'pnpm vite dev',
    port: 5173,
    reuseExistingServer: false,
  },
});
