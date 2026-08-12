//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'CallsPlugin': 'src/CallsPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'plugin.node': 'src/plugin.node.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'translations': 'src/translations.ts',
    'CallsCapabilities': 'src/types/CallsCapabilities.ts',
    'CallsEvents': 'src/types/CallsEvents.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
