//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9005 --config-dir=.storybook',
    // `url`, not `port`: with `port` Playwright's readiness probe is `isPortUsed()`, a bare TCP
    // check (webServerPlugin.js passes checkPortOnly when `port` is set), and `storybook dev` binds
    // the socket before it can serve — then Vite's dep-optimization restarts the server, so tests
    // that started in the gap get ERR_CONNECTION_REFUSED. In run 31126663421 that failed
    // react-ui-table's first two specs at 46ms and 57ms while the remaining seven passed. `url`
    // makes the probe an actual HTTP fetch, so the dep scan is already done before tests start.
    url: 'http://localhost:9005',
    reuseExistingServer: false,
  },
});
