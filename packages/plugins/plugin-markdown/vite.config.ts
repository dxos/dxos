//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    blueprints: 'src/blueprints/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    'MarkdownPlugin.node': 'src/MarkdownPlugin.node.ts',
    MarkdownPlugin: 'src/MarkdownPlugin.tsx',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
