//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: { timeout: 60_000 },
  // TODO(wittjosiah): Browser tests.
  // browser: {
  //   nodeExternal: true,
  // },
});
