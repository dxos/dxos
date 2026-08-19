//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@playwright/test';

import { e2ePreset } from '@dxos/test-utils/playwright';

import base from './playwright.config';

/**
 * The e2e suite against a build of the curated production plugin set (`DX_PLUGIN_SET=production`),
 * rather than the full catalog `playwright.config.ts` serves. Same specs, same `vite preview` — what
 * differs is the bundle under them, which is the point: a plugin the set omits and a spec still needs
 * fails here rather than after a deploy.
 *
 * Run with:
 *
 *   moon run composer-app:e2e-production
 *
 * `inbox.spec.ts` is excluded because the production set deliberately ships neither `plugin-inbox`
 * nor a mail provider — the spec asserts behaviour this build does not claim to have. Every other
 * exclusion is inherited: the specs the base config cannot host (startup benchmarks, `dev-*`,
 * storybook-driven), for the same reasons stated there.
 */
export default defineConfig({
  ...e2ePreset(import.meta.dirname),
  ...base,
  testIgnore: [...(base.testIgnore as string[]), '**/inbox.spec.ts'],
});
