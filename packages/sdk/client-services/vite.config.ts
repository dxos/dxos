//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'packlets/locks/browser': 'src/packlets/locks/browser.ts',
    'packlets/locks/node': 'src/packlets/locks/node.ts',
    'packlets/diagnostics/browser-diagnostics-broadcast': 'src/packlets/diagnostics/browser-diagnostics-broadcast.ts',
    'packlets/diagnostics/diagnostics-broadcast': 'src/packlets/diagnostics/diagnostics-broadcast.ts',
    testing: 'src/testing/index.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
