//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SpacetimePlugin: 'src/SpacetimePlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    Model: 'src/types/Model.ts',
    Scene: 'src/types/Scene.ts',
    Settings: 'src/types/Settings.ts',
    SpacetimeCapabilities: 'src/types/SpacetimeCapabilities.ts',
    SpacetimeEvents: 'src/types/SpacetimeEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
