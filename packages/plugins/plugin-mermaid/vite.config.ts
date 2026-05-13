//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    meta: 'src/meta.ts',
    MermaidPlugin: 'src/MermaidPlugin.tsx',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
