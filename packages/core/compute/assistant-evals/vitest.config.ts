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
export default defineConfig({
  root: dirname,
  plugins: [PluginImportSource()],
});
