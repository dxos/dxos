//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default createConfig({
  dirname,
  node: {
    // TODO(dmaretskyi): Enabled because client tests were flaky. Remove when that's not the case.
    retry: 2,
  },
  browser: 'chromium',
});
