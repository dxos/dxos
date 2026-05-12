//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    GamePlugin: 'src/GamePlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    util: 'src/util/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
