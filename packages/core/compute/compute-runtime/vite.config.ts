//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'node-shell': 'src/node-shell.ts',
    // Apart from the barrel: EDGE's plugin host wraps handlers with it, and the barrel's process managers and AI providers
    // would otherwise load into every plugin bundle.
    'protocol': 'src/protocol.ts',
    'remote-process': 'src/remote-process.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
