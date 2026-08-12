//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    TransformerPlugin: 'src/TransformerPlugin.ts',
    plugin: 'src/plugin.tsx',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.tsx',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
