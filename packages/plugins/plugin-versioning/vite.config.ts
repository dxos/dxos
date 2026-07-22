//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'VersioningPlugin': 'src/VersioningPlugin.tsx',
    'VersioningPlugin.node': 'src/VersioningPlugin.node.ts',
    'VersioningPlugin.workerd': 'src/VersioningPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
