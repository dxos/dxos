//
// Copyright 2026 DXOS.org
//

import type { TestProjectConfiguration } from 'vitest/config';

const envEnabled = (name: string): boolean => ['1', 'true'].includes(process.env[name] ?? '');

/**
 * Native Vitest tags used across the repo. Filter at the CLI with
 * `--tagsFilter "<expr>"` (boolean expressions over these names).
 *
 * Kept in this lightweight module (no plugin / dependency imports) so
 * standalone vitest configs — like `tools/vite-plugin-log` — can declare
 * the same tag set without pulling in DXOS Vite plugins via
 * `vitest.base.config.ts`.
 */
export const TEST_TAGS: NonNullable<TestProjectConfiguration['test']>['tags'] = [
  { name: 'flaky', description: 'Tests that may be flaky (Trunk pass-on-rerun integration).' },
  { name: 'sync', description: 'Tests that hit external sync APIs (Discord, Linear, browser-based).' },
  { name: 'sync-e2e', description: 'End-to-end tests against the real EDGE worker.' },
  { name: 'functions-e2e', description: 'End-to-end tests that deploy and invoke real Cloudflare functions.' },
  {
    name: 'manual',
    description: 'Opt-in tests run only when explicitly selected (local services, manual setup).',
    // Skipped by DEFAULT; DX_RUN_MANUAL_TESTS=1 opts in (these tests need local services
    // like Ollama/LM Studio that a plain `moon run :test` machine does not have).
    skip: !envEnabled('DX_RUN_MANUAL_TESTS'),
  },
  {
    name: 'model-fixture',
    description: 'Replay of recorded LLM turns from the model-fixture store. Skipped by default.',
    // The single place model-fixture env-gating lives. Skipped by DEFAULT so a plain `moon run :test`
    // never needs an API key; the dedicated model-fixture CI workflow opts in with
    // DX_RUN_MODEL_FIXTURE_TESTS=1 (replay), and fixture regeneration sets DX_UPDATE_MODEL_FIXTURES=1
    // (which must also un-skip, since generation runs through the same suites).
    skip: !envEnabled('DX_RUN_MODEL_FIXTURE_TESTS') && !envEnabled('DX_UPDATE_MODEL_FIXTURES'),
  },
  {
    name: 'memory',
    description: 'Retention/footprint tests that need a forced GC. Skipped by default.',
    // Gated on DX_DEBUG_LEAKS rather than a flag of its own: that is the same variable
    // `vite.base.config.ts` keys `--expose-gc` off, and without `global.gc` every WeakRef still
    // reads as alive, so an un-gated run would report retention that isn't there.
    skip: !envEnabled('DX_DEBUG_LEAKS'),
  },
];
