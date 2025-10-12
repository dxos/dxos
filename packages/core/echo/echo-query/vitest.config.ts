//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,

  // TODO(dmaretskyi): Browser test fail on CI for mysterious reasons.
  // browser: {
  //   browsers: ['chromium'],
  // },
});
