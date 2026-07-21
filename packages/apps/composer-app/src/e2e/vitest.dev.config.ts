//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vitest/config';

/**
 * Dev-server harness config — measures `vite serve` startup, not `vite preview`.
 *
 *   DX_PWA=false moon run composer-app:e2e-dev
 */
export default defineConfig({
  test: {
    name: 'e2e-dev',
    environment: 'node',
    include: ['src/e2e/dev-startup.spec.ts'],
    globalSetup: ['src/e2e/setup/dev-server.ts'],
    // Dev pre-bundling + per-file transformation can swing wide on a cold cache.
    testTimeout: 240_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
