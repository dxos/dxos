//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'PreviewPlugin': 'src/PreviewPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'plugin.node': 'src/plugin.node.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.workerd': 'src/capabilities/workerd.ts',
    'meta': 'src/meta.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
