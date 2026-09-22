//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@playwright/test';
import path from 'node:path';

import { e2ePreset } from '@dxos/test-utils/playwright';

/**
 * The behavioural suite — every spec in this directory, against the production bundle.
 *
 * Measurement harnesses are deliberately NOT here: `startup.spec.ts` and `perf-*.spec.ts` record
 * numbers rather than asserting behaviour and `dev-*` needs `vite serve`, so they stay in
 * composer-app beside the budget tasks that gate on them (`e2e-startup`, `e2e-perf`, `e2e-dev`).
 *
 *   DX_PWA=false moon run composer-e2e:e2e
 *
 * Every spec here is the automated arm of a `test QA-n` in an `.mdl` spec — see BEST-PRACTICES.md.
 */

/** The app under test. `vite preview` serves its `out/composer`, which `composer-app:bundle-e2e` builds. */
const APP_DIR = path.resolve(import.meta.dirname, '../../../../apps/composer-app');

export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Two-peer specs boot two app instances per worker, so 4 overloads the cell.
  workers: 3,
  webServer: {
    // `--dir` rather than a `cwd` option: the app's `vite.config.ts` resolves its own plugins
    // relative to the package it lives in, and `preview` still evaluates it.
    command: `pnpm --dir ${APP_DIR} exec vite preview --configLoader native`,
    port: 4173,
    timeout: 300_000,
  },
});
