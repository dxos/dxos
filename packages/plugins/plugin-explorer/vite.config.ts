//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    types: 'src/types/index.ts',
    ExplorerPlugin: 'src/ExplorerPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
