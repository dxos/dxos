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
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
      'SampleCapabilities': 'src/types/SampleCapabilities.ts',
    'SampleEvents': 'src/types/SampleEvents.ts',
    'SampleItem': 'src/types/SampleItem.ts',
    'SampleOperation': 'src/types/SampleOperation.ts',
    'Settings': 'src/types/Settings.ts',
},
  jsx: 'react',
  test: { node: true },
});
