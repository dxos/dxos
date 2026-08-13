//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'ConnectorPlugin': 'src/ConnectorPlugin.ts',
    'plugin.node': 'src/plugin.node.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'ConnectorAnnotations': 'src/types/ConnectorAnnotations.ts',
    'ConnectorSpec': 'src/types/ConnectorSpec.ts',
    'ConnectorCoordination': 'src/types/ConnectorCoordination.ts',
    'ConnectorForm': 'src/types/ConnectorForm.ts',
    'ConnectorEvents': 'src/types/ConnectorEvents.ts',
    'ConnectorOperation': 'src/types/ConnectorOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
