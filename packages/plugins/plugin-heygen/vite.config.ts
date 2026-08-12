//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    HeyGenPlugin: 'src/HeyGenPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.tsx',
    services: 'src/services/index.ts',
    components: 'src/components/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
