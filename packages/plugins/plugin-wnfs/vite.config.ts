//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'WnfsPlugin': 'src/WnfsPlugin.tsx',
    'WnfsPlugin.node': 'src/WnfsPlugin.node.ts',
    'WnfsPlugin.workerd': 'src/WnfsPlugin.workerd.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'helpers/index': 'src/helpers/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
