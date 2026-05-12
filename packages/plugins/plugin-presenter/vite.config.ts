//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    PresenterPlugin: 'src/PresenterPlugin.tsx',
    'PresenterPlugin.node': 'src/PresenterPlugin.node.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
