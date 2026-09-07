//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'Binding': 'src/Binding.ts',
    'ConnectorAuth': 'src/ConnectorAuth.ts',
    'ConnectorPlugin': 'src/ConnectorPlugin.ts',
    'capabilities': 'src/capabilities/index.ts',
    'create-panel': 'src/capabilities/create-panel.ts',
    'create-panel.browser': 'src/capabilities/create-panel.browser.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'skills': 'src/skills/index.ts',
    'ConnectorsSkill': 'src/skills/ConnectorsSkill.ts',
    'translations': 'src/translations.ts',
    'ConnectorAnnotations': 'src/types/ConnectorAnnotations.ts',
    'ConnectorSpec': 'src/types/ConnectorSpec.ts',
    'ConnectorCoordination': 'src/types/ConnectorCoordination.ts',
    'ConnectorEvents': 'src/types/ConnectorEvents.ts',
    'ConnectorOperation': 'src/types/ConnectorOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
