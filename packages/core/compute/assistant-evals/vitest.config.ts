//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import PluginImportSource from '@dxos/vite-plugin-import-source';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Default config, auto-discovered by `evalite` (which hardcodes its own `**/*.eval.?(m)ts`
// include and can't be pointed at `vitest.e2e.config.ts` instead) — must stay flat, not a
// `projects` workspace, or evalite's file discovery finds nothing.
//
// `#*` must be included (matching `createNodeProject` in vite.base.config.ts) or Node subpath
// imports (e.g. plugin-routine's `#capabilities`) resolve to the compiled `dist/` bundle instead
// of `src/`. That bundle eagerly evaluates several independently-lazy capability modules together,
// reordering operation-handler registration relative to registry-sync's subscriber and causing a
// `Cannot read properties of undefined (reading 'meta')` race absent under plain vitest.
export default defineConfig({
  root: dirname,
  plugins: [PluginImportSource({ include: ['@dxos/**', '#*'] })],
});
