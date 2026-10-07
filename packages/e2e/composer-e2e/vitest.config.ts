//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config.ts';

// A `vitest.config.ts`, not a `vite.config.ts`: this package builds nothing, and a vite config
// makes knip resolve the workspace through its vite plugin, losing every import the specs make.
// Node only — vitest covers `report.ts`; the specs themselves are Playwright's.
export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
