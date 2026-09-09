//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AtprotoPlugin: 'src/AtprotoPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    AtprotoCapabilities: 'src/types/AtprotoCapabilities.ts',
    AtprotoEvents: 'src/types/AtprotoEvents.ts',
    AtprotoPublication: 'src/types/AtprotoPublication.ts',
  },
  jsx: 'react',
  reactCompiler: true,
  test: { node: true, storybook: true },
});
