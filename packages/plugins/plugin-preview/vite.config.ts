//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    PreviewPlugin: 'src/PreviewPlugin.tsx',
    'PreviewPlugin.node': 'src/PreviewPlugin.node.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
