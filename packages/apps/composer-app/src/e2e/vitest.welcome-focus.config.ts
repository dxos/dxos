//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vitest/config';

/**
 * Storybook harness for Welcome focus regression.
 *
 *   moon run composer-app:e2e-welcome-focus
 */
export default defineConfig({
  test: {
    name: 'e2e-welcome-focus',
    environment: 'node',
    include: ['src/e2e/welcome-focus.spec.ts'],
    globalSetup: ['src/e2e/setup/storybook-server.ts'],
    testTimeout: 120_000,
    hookTimeout: 240_000,
    fileParallelism: false,
  },
});
