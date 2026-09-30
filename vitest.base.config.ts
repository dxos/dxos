//
// Copyright 2026 DXOS.org
//
// Legacy re-export shim. New per-package configs should import
// `defineConfig` from `./vite.base.config.ts` directly (build + test in one file).
// Kept for packages with no library build of their own (e2e suites, workspace
// tools) whose standalone `vitest.config.ts` imports `createConfig` from here.
//

export { TEST_TAGS, createConfig } from './vite.base.config.ts';
export type { ConfigOptions, StorybookOptions } from './vite.base.config.ts';
