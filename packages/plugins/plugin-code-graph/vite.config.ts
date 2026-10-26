//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'CodeGraphPlugin': 'src/CodeGraphPlugin.ts',
    'capabilities': 'src/capabilities/index.ts',
    'client': 'src/client/index.ts',
    'command': 'src/command/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'graph': 'src/graph/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'skills': 'src/skills/index.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'CodeGraph': 'src/types/CodeGraph.ts',
    'CodeGraphOperation': 'src/types/CodeGraphOperation.ts',
    'CodeGraphSkill': 'src/skills/CodeGraphSkill.ts',
    'vite-plugin': 'src/vite-plugin/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
