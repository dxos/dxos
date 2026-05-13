//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    blueprints: 'src/blueprints/index.ts',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    'AssistantPlugin.node': 'src/AssistantPlugin.node.ts',
    AssistantPlugin: 'src/AssistantPlugin.ts',
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
