//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ConductorPlugin: 'src/ConductorPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.tsx',
    translations: 'src/translations.ts',
    ConductorEvents: 'src/types/ConductorEvents.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
