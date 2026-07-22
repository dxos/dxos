//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config.ts';

// Explicit `--config` target for the `:test` task (`src/testing/*.test.ts`), kept separate from
// the default `vitest.config.ts` because evalite can't be pointed at an alternate config file and
// needs a flat (non-workspace) one to discover `.eval.ts` files.
export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
