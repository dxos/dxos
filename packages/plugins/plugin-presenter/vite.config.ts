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
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    'PresenterPlugin.node': 'src/PresenterPlugin.node.ts',
    PresenterPlugin: 'src/PresenterPlugin.tsx',
    testing: 'src/testing.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
