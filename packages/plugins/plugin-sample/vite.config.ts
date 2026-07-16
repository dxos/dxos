//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SamplePlugin': 'src/SamplePlugin.ts',
    'SamplePlugin.node': 'src/SamplePlugin.node.ts',
    'SamplePlugin.workerd': 'src/SamplePlugin.workerd.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components/index': 'src/components/index.ts',
    'containers/index': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
