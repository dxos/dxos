//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    containers: 'src/containers/index.ts',
    plugin: 'src/plugin.ts',
    templates: 'src/templates/index.ts',
    translations: 'src/translations.ts',
    blueprints: 'src/blueprints/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    'ScriptPlugin.node': 'src/ScriptPlugin.node.ts',
    ScriptPlugin: 'src/ScriptPlugin.tsx',
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
