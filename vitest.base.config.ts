//
// Copyright 2026 DXOS.org
//
// Legacy re-export shim. New per-package configs should import
// `defineConfig` from `./vite.base.config.ts` directly (build + test in one file).
// Kept so packages still on `ts-build` (with a standalone `vitest.config.ts`)
// can continue importing `createConfig` from here.
//

export { TEST_TAGS, createConfig } from './vite.base.config.ts';
export type { ConfigOptions, StorybookOptions } from './vite.base.config.ts';
