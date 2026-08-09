//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm vite preview --port=9007',
    // `port` makes Playwright's probe a bare TCP check, and `storybook dev` binds the socket before
    // it can serve, so tests starting in that gap get ERR_CONNECTION_REFUSED.
    url: 'http://localhost:9007',
    reuseExistingServer: false,
  },
});
