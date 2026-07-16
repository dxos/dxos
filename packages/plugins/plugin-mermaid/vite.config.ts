//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    MermaidPlugin: 'src/MermaidPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true, storybook: true },
});
