//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/ProjectGraph': 'src/ProjectGraph.ts',
    'ns/ProjectHooks': 'src/ProjectHooks.ts',
    'ns/SpecCommands': 'src/SpecCommands.ts',
    'ns/SpecModel': 'src/SpecModel.ts',
    'ns/SpecViews': 'src/SpecViews.ts',
    'ns/Templates': 'src/Templates.ts',
    'templates': 'src/templates/index.ts',
    'ProjectOperationHandlerSet': 'src/operations/ProjectOperationHandlerSet.ts',
    'ProjectSkill': 'src/skills/project/ProjectSkill.ts',
    'index': 'src/index.ts',
    'skills': 'src/skills/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'LegacyProject': 'src/types/LegacyProject.ts',
    'ProjectCapabilities': 'src/types/ProjectCapabilities.ts',
    'ProjectMailboxOperation': 'src/types/ProjectMailboxOperation.ts',
    'ProjectOperation': 'src/types/ProjectOperation.ts',
    'ProjectSurface': 'src/types/ProjectSurface.ts',
    'ProjectView': 'src/types/ProjectView.ts',
    'ProjectsEvents': 'src/types/ProjectsEvents.ts',
    'Settings': 'src/types/Settings.ts',
    'SpecSession': 'src/types/SpecSession.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill — tens of seconds, against a
  // couple for each story after it — which the 15s browser-mode default cannot cover.
  test: { node: true, storybook: { timeout: 60_000 }, workerd: true },
});
