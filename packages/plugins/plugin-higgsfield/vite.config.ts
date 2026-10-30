//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/HiggsfieldEvents': 'src/HiggsfieldEvents.ts',
    'index': 'src/index.ts',
    'services': 'src/services/index.ts',
  },
  test: { node: true },
});
