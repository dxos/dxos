//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'AttentionPlugin': 'src/AttentionPlugin.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
