//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    SpotlightCapabilities: 'src/types/SpotlightCapabilities.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
