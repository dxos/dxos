//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  // TODO(wittjosiah): This is only required because query.ts is pulling in code from markdown plugin with DOM deps.
  node: { environment: 'jsdom' },
  storybook: true,
});
