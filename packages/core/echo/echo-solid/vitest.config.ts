//
// Copyright 2025 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SolidPlugin from 'vite-plugin-solid';
import { createConfig } from '../../../../vitest.base.config';

// TODO(wittjosiah): Get working with vitest.base.config.ts.
export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  browser: {
    browsers: ['chromium'],
    plugins: [SolidPlugin()],
  },
});
