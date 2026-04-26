//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

/**
 * Dev-server harness config — measures `vite serve` startup, not `vite preview`.
 *
 * The webServer command is `pnpm vite serve --port 4173` so the app-manager's
 * `INITIAL_URL` (also 4173) keeps working without a second URL constant. The
 * `testMatch` constraint scopes this config to `dev-startup.spec.ts` only — the
 * production `startup.spec.ts` continues to run under `playwright.config.ts`.
 *
 * Run with:
 *
 *   DX_PWA=false moon run composer-app:e2e-dev
 *
 * The first run after a `pnpm install` may be slow because vite has to
 * pre-bundle deps from a cold cache; subsequent runs amortize via
 * `node_modules/.vite`.
 */
export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  testMatch: '**/dev-startup.spec.ts',
  // Dev pre-bundling + per-file transformation can swing wide on a cold cache.
  timeout: 180_000,
  webServer: {
    command: 'pnpm vite --port 4173',
    port: 4173,
    reuseExistingServer: false,
    // Vite pre-bundling on a cold `.vite` cache for composer-app routinely
    // takes ~30 s; `webServer.timeout` is the cap on "wait for `port` to listen".
    timeout: 300_000,
  },
});
