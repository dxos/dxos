//
// Copyright 2026 DXOS.org
//
// Shim — vitest configuration now lives in `vite.base.config.ts` so a single
// per-package `vite.config.ts` can drive both `vite build` and `vitest run`.
// New code should `import { defineConfig } from '../../../vite.base.config.ts'`
// and pass `test: { node: true }` to opt into tests.
//
// Legacy `vitest.config.ts` files in packages that haven't migrated yet still
// import `createConfig`/`createTestConfig` from here.
//

export { TEST_TAGS, createConfig, createTestConfig } from './vite.base.config.ts';
export type { ConfigOptions } from './vite.base.config.ts';
