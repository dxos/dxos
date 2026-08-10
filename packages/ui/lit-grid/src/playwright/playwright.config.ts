//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset, storybookWebServer } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Serialized, unlike the shared preset's 2: `storybook dev` compiles the story on first request, so
  // two workers requesting it concurrently can hang one past the 30s action timeout in `grid.ready()`.
  workers: 1,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: storybookWebServer(9002),
});
