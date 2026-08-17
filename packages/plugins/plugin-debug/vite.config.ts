//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'DebugPlugin': 'src/DebugPlugin.ts',
    'plugin': 'src/plugin.tsx',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.node': 'src/capabilities/gen/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'translations': 'src/translations.ts',
    'Debug': 'src/types/Debug.ts',
    'DebugEvents': 'src/types/DebugEvents.ts',
    'DebugNodes': 'src/types/DebugNodes.ts',
    'DebugSurface': 'src/types/DebugSurface.ts',
    'Settings': 'src/types/Settings.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
