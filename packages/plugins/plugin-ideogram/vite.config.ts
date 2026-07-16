//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'IdeogramPlugin': 'src/IdeogramPlugin.tsx',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'services/index': 'src/services/index.ts',
  },
  test: { node: true },
});
