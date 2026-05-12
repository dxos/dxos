//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    GamePlugin: 'src/GamePlugin.tsx',
    types: 'src/types/index.ts',
    util: 'src/util/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
