//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CommercePlugin: 'src/CommercePlugin.tsx',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
      'CommerceEvents': 'src/types/CommerceEvents.ts',
    'Provider': 'src/types/Provider.ts',
    'Result': 'src/types/Result.ts',
    'Search': 'src/types/Search.ts',
    'SearchOperation': 'src/types/SearchOperation.ts',
},
  jsx: 'react',
  test: { node: true, storybook: true },
});
