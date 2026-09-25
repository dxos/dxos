//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset, storybookWebServer } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // `storybook dev` compiles per request, so concurrent story boots starve each other on a loaded
  // CI cell.
  workers: 1,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: storybookWebServer(9002),
});
