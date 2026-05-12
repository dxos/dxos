//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    blueprints: 'src/blueprints/index.ts',
    capabilities: 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    MarkdownPlugin: 'src/MarkdownPlugin.tsx',
    'MarkdownPlugin.node': 'src/MarkdownPlugin.node.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
