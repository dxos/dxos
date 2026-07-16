//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'BlueskyPlugin': 'src/BlueskyPlugin.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types.ts',
  },
  jsx: 'react',
  test: { node: true },
});
