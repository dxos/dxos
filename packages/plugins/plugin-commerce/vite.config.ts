//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CommercePlugin: 'src/CommercePlugin.tsx',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true, storybook: true },
});
