//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SpacePlugin': 'src/SpacePlugin.ts',
    'SpacePlugin.node': 'src/SpacePlugin.node.ts',
    'SpacePlugin.workerd': 'src/SpacePlugin.workerd.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'capabilities/node': 'src/capabilities/node.ts',
    'components/index': 'src/components/index.ts',
    'constants': 'src/constants.ts',
    'containers/index': 'src/containers/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'types/index': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
