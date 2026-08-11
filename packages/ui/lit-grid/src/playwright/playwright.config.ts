//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset, storybookWebServer } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // Two stories booting concurrently on a loaded CI cell starve `storybook dev`'s per-request
  // compile: `mouse access` timed out at 30s with the story never painted (webkit AND firefox
  // cells, run 31501206028) while 24/24 local runs at 2 workers passed — the contention is
  // CI-only.
  workers: 1,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: storybookWebServer(9002),
});
