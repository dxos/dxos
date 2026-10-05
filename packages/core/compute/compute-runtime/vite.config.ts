//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'node-subprocess': 'src/node-subprocess.ts',
    'remote-process': 'src/remote-process.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
