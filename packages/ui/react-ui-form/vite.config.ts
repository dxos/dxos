//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    annotations: 'src/annotations.ts',
    index: 'src/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types.ts',
  },
  jsx: 'react',
});
