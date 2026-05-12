//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    RegistryPlugin: 'src/RegistryPlugin.tsx',
    'RegistryPlugin.node': 'src/RegistryPlugin.node.ts',
    types: 'src/types.ts',
    cli: 'src/cli/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
