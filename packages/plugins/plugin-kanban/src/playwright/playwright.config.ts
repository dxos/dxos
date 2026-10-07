//
// Copyright 2024 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset, storybookWebServer } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // TODO(wittjosiah): Stories are slow to start up. 120s so the 90s readiness budget in
  //   `board-manager.ts` still leaves a test room to do its work; at 60s the two were in conflict.
  timeout: 120_000,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: storybookWebServer(9011),
});
