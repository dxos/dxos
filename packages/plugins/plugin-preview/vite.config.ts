//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'PreviewPlugin': 'src/PreviewPlugin.tsx',
    'PreviewPlugin.node': 'src/PreviewPlugin.node.ts',
    'PreviewPlugin.workerd': 'src/PreviewPlugin.workerd.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
