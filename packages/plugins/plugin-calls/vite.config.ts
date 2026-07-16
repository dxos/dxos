//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'CallsPlugin': 'src/CallsPlugin.tsx',
    'CallsPlugin.node': 'src/CallsPlugin.node.ts',
    'CallsPlugin.workerd': 'src/CallsPlugin.workerd.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
