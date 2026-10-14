//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset, storybookWebServer } from '@dxos/test-utils/playwright';

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  // A compute story boots a client, a plugin manager and the assistant toolkit before the first node
  // paints, and storybook compiles it on demand; the preset's 60s is not enough for that cold path.
  timeout: 180_000,
  // One worker: two cold compiles of the same heavy story race each other over the dev server.
  workers: 1,
  // TODO(wittjosiah): Avoid hard-coding ports.
  webServer: storybookWebServer(9007),
});
