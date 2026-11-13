//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/Cell': 'src/Cell.ts',
    'ns/ModuleContainer': 'src/ModuleContainer.ts',
    'ns/ModuleSurfacesPlugin': 'src/ModuleSurfacesPlugin.ts',
    'ns/StoryAiPlugin': 'src/StoryAiPlugin.ts',
    'ns/StoryEmbed': 'src/StoryEmbed.tsx',
    'ns/StoryHarness': 'src/StoryHarness.ts',
    'ns/StoryLayout': 'src/StoryLayout.ts',
    'ns/StoryModules': 'src/StoryModules.ts',
    'ns/StoryPeers': 'src/StoryPeers.ts',
    'ns/StorySnapshot': 'src/StorySnapshot.ts',
    'ns/StoryStagePlugin': 'src/StoryStagePlugin.ts',
    'index': 'src/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
