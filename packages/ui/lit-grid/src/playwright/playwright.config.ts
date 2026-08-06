//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Serialized, unlike the shared preset's 2. `webServer.port` only waits for the port to listen,
  // while `storybook dev` compiles the story on first request — so with two workers both request it
  // mid-optimizeDeps and one hangs past the 30s action timeout in `grid.ready()`. In run 31111016212
  // that killed one of three tests in 5 of 6 firefox/webkit cells while the other two passed in ~3s;
  // chromium warmed fast enough to survive all three times. These three tests total ~7s, so paying
  // the compile once in the first test costs less than the concurrency bought.
  workers: 1,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: {
    command: 'pnpm storybook dev --ci --quiet --port=9002 --config-dir=.storybook',
    port: 9002,
    reuseExistingServer: false,
  },
});
