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
    // `url`, not `port`: a `port` probe is a bare TCP check, satisfied as soon as the server binds
    // the socket, so tests starting before it can serve get ERR_CONNECTION_REFUSED.
    url: 'http://localhost:9007',
    reuseExistingServer: false,
  },
});
