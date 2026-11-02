//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    translations: 'src/translations.ts',
    Template: 'src/types/Template.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
