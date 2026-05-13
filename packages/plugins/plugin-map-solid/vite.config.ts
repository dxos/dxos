//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    meta: 'src/meta.ts',
    'MapPlugin.node': 'src/MapPlugin.node.ts',
    MapPlugin: 'src/MapPlugin.tsx',
  },
  jsx: 'solid',
  test: { node: { environment: 'happy-dom' } },
});
