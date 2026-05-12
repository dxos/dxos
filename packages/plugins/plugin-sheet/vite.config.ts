//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    SheetPlugin: 'src/SheetPlugin.tsx',
    'SheetPlugin.node': 'src/SheetPlugin.node.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    testing: 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
