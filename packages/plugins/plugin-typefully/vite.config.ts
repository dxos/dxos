//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'TypefullyPlugin': 'src/TypefullyPlugin.tsx',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'services/index': 'src/services/index.ts',
  },
  test: { node: true },
});
