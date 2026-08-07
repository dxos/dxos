//
// Copyright 2024 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Serialized, unlike the shared preset's 2, for the same reason as lit-grid and todomvc: every test
  // waits on the story in `waitUntilReady()` (board-manager.ts:9), so two workers race the same
  // first-paint. In run 31140179355 that timed out `create new item` on webkit at 30s waiting for
  // `board-column`, and `rearrange columns` was deferred earlier for a 28.5s failure of the same
  // shape. Deferring one of five would have moved the failure, not removed it. The suite runs
  // 28-58s at two workers and shares a cell with composer, so the added wall time is real but small
  // against that cell's ~230s.
  workers: 1,
  // TODO(wittjosiah): Stories are slow to start up.
  timeout: 60_000,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9011 --config-dir=.storybook',
    // `url`, not `port`: with `port` Playwright's readiness probe is `isPortUsed()`, a bare TCP
    // check (webServerPlugin.js passes checkPortOnly when `port` is set), and `storybook dev` binds
    // the socket before it can serve — then Vite's dep-optimization restarts the server, so tests
    // that started in the gap get ERR_CONNECTION_REFUSED. In run 31126663421 that failed
    // react-ui-table's first two specs at 46ms and 57ms while the remaining seven passed. `url`
    // makes the probe an actual HTTP fetch, so the dep scan is already done before tests start.
    url: 'http://localhost:9011',
    reuseExistingServer: false,
  },
});
