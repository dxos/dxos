//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    TerraPlugin: 'src/TerraPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
      'Terra': 'src/types/Terra.ts',
    'TerraObject': 'src/types/TerraObject.ts',
},
  jsx: 'react',
  // The Objects story generates a full planet + object sim (~30s under CI load, observed at
  // 29.6s locally with a retry), exceeding vitest's 15s browser-mode default.
  test: { node: { environment: 'happy-dom' }, storybook: { timeout: 60_000 } },
});
