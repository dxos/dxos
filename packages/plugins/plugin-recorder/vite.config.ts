//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    RecorderPlugin: 'src/RecorderPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    RecorderCapabilities: 'src/types/RecorderCapabilities.ts',
    RecorderEvents: 'src/types/RecorderEvents.ts',
    RecorderSettings: 'src/types/RecorderSettings.ts',
    Recording: 'src/types/Recording.ts',
    Take: 'src/types/Take.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
