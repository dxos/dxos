//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config.ts';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
  // Memoized-LLM tests replay cached conversations through a full plugin harness;
  // CI machines need more than the 15s global default.
  timeout: 60_000,
});
