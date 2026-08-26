//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SpacePlugin': 'src/SpacePlugin.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'constants': 'src/constants.ts',
    'containers': 'src/containers/index.ts',
    'dashboard': 'src/dashboard/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'SpaceOperationHandlerSet': 'src/operations/SpaceOperationHandlerSet.ts',
    'plugin': 'src/plugin.ts',
    'skills': 'src/skills/index.ts',
    'DatabaseSkill': 'src/skills/DatabaseSkill.ts',
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
