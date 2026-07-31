//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ConductorPlugin: 'src/ConductorPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
