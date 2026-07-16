//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'CrxPlugin': 'src/CrxPlugin.tsx',
    'capabilities/index': 'src/capabilities/index.ts',
    'containers/index': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
    'util': 'src/util/index.ts',
    'operations/index': 'src/operations/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
