//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/CorePlugins': 'src/CorePlugins.ts',
    'ns/Corpus': 'src/Corpus.ts',
    'index': 'src/index.ts',
    'components': 'src/components/index.ts',
    'core': 'src/core.ts',
    'harness': 'src/Harness.ts',
    'operations': 'src/operations/index.ts',
    'StorybookCapabilities': 'src/types/StorybookCapabilities.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
