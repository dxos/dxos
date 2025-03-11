//
// Copyright 2023 DXOS.org
//

// TODO(ZaymonFC): Convert these back to ESM syntax which currently breaks bundling.
const { nxE2EPreset } = require('@nx/playwright/preset');
const { defineConfig } = require('@playwright/test');
const { e2ePreset } = require('@dxos/test-utils/playwright');

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: __dirname }),
  ...e2ePreset(__dirname),
  webServer: {
    command: 'pnpm -w nx serve rpc-tunnel-e2e',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
