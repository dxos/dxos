//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    GitHubPlugin: 'src/GitHubPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    extensions: 'src/extensions/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    skills: 'src/skills/index.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    GitHubCapabilities: 'src/types/GitHubCapabilities.ts',
    GitHubEvents: 'src/types/GitHubEvents.ts',
    GitHubOperation: 'src/types/GitHubOperation.ts',
    Walkthrough: 'src/types/Walkthrough.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
