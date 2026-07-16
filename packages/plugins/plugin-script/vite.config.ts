//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ScriptPlugin': 'src/ScriptPlugin.tsx',
    'ScriptPlugin.node': 'src/ScriptPlugin.node.ts',
    'ScriptPlugin.workerd': 'src/ScriptPlugin.workerd.ts',
    'skills/index': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'templates': 'src/templates/index.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
    'testing': 'src/testing/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true, storybook: true },
});
