//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    TransformerPlugin: 'src/TransformerPlugin.tsx',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
