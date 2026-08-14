//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SpacePlugin': 'src/SpacePlugin.ts',
    'plugin.node': 'src/plugin.node.ts',
    'plugin.workerd': 'src/plugin.workerd.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities.workerd': 'src/capabilities/workerd.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components': 'src/components/index.ts',
    'constants': 'src/constants.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'SpaceCapabilities': 'src/types/SpaceCapabilities.ts',
    'SpaceEvents': 'src/types/SpaceEvents.ts',
    'SpaceForm': 'src/types/SpaceForm.ts',
    'SpaceSchema': 'src/types/SpaceSchema.ts',
    'SpaceSurface': 'src/types/SpaceSurface.ts',
    'SpaceCapability': 'src/types/SpaceCapability.ts',
    'types/Settings': 'src/types/Settings.ts',
    'CollectionOperation': 'src/types/CollectionOperation.ts',
    'SpaceOperation': 'src/types/SpaceOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
