//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    'PreviewPlugin.node': 'src/PreviewPlugin.node.ts',
    PreviewPlugin: 'src/PreviewPlugin.tsx',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
