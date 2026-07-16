//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'BrainPlugin': 'src/BrainPlugin.tsx',
    'capabilities/index': 'src/capabilities/index.ts',
    'operations/index': 'src/operations/index.ts',
    'skills/index': 'src/skills/index.ts',
    'types/index': 'src/types/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'containers/index': 'src/containers/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
