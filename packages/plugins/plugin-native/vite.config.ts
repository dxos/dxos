//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
