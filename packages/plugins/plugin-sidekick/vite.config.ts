//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SidekickPlugin: 'src/SidekickPlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.tsx',
    translations: 'src/translations.ts',
    Profile: 'src/types/Profile.ts',
    Sidekick: 'src/types/Sidekick.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
