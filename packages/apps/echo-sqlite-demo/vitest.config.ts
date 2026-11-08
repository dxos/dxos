//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config.ts';

// The app's own `vite.config.ts` builds the bundle; tests are node-only (the assistant's tools,
// which run against a SQLite file rather than OPFS).
export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
