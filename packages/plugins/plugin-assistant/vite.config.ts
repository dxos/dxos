//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    blueprints: 'src/blueprints/index.ts',
    cli: 'src/cli/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    AssistantPlugin: 'src/AssistantPlugin.tsx',
    'AssistantPlugin.node': 'src/AssistantPlugin.node.ts',
    testing: 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
