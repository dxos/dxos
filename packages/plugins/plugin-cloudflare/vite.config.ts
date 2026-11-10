//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    services: 'src/services/index.ts',
    translations: 'src/translations.ts',
  },
  test: { node: true },
});
