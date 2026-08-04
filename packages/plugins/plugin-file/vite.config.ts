//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'FilePlugin': 'src/FilePlugin.tsx',
    'FilePlugin.node': 'src/FilePlugin.node.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'FileLimits': 'src/types/FileLimits.ts',
    'FileCapabilities': 'src/types/FileCapabilities.ts',
    'FileEvents': 'src/types/FileEvents.ts',
    'FileOperation': 'src/types/FileOperation.ts',
    'Settings': 'src/types/Settings.ts',
  },
  jsx: 'react',
  test: { node: true },
});
