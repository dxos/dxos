//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
    'packlets/locks/node': 'src/packlets/locks/node.ts',
    'packlets/locks/browser': 'src/packlets/locks/browser.ts',
    'packlets/diagnostics/diagnostics-broadcast': 'src/packlets/diagnostics/diagnostics-broadcast.ts',
    'packlets/diagnostics/browser-diagnostics-broadcast': 'src/packlets/diagnostics/browser-diagnostics-broadcast.ts',
  },
  test: { node: true },
});
