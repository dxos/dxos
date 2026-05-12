//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    PreviewPlugin: 'src/PreviewPlugin.tsx',
    'PreviewPlugin.node': 'src/PreviewPlugin.node.ts',
    translations: 'src/translations.ts',
    plugin: 'src/plugin.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
