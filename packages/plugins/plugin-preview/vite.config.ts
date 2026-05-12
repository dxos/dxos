//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    PreviewPlugin: 'src/PreviewPlugin.tsx',
    'PreviewPlugin.node': 'src/PreviewPlugin.node.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
