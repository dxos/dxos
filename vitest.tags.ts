//
// Copyright 2026 DXOS.org
//

import type { TestProjectConfiguration } from 'vitest/config';

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
  { name: 'llm', description: 'Tests that hit external LLM APIs (Anthropic, OpenAI, Ollama).' },
  { name: 'sync', description: 'Tests that hit external sync APIs (Discord, Linear, browser-based).' },
  { name: 'sync-e2e', description: 'End-to-end tests against the real EDGE worker.' },
  { name: 'functions-e2e', description: 'End-to-end tests that deploy and invoke real Cloudflare functions.' },
  { name: 'tracing-e2e', description: 'End-to-end tracing/observability tests against SigNoz.' },
];
