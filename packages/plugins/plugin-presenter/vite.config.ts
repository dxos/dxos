//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'PresenterPlugin': 'src/PresenterPlugin.tsx',
    'PresenterPlugin.node': 'src/PresenterPlugin.node.ts',
    'PresenterPlugin.workerd': 'src/PresenterPlugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
    'testing': 'src/testing.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
