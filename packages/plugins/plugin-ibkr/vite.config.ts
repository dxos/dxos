//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'IbkrPlugin': 'src/IbkrPlugin.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'skills/index': 'src/skills/index.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
