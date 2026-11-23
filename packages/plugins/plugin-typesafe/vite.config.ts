//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/TypeSafeEvents': 'src/TypeSafeEvents.ts',
    'index': 'src/index.ts',
    'types': 'src/types/index.ts',
    'TypeSafeCapabilities': 'src/types/TypeSafeCapabilities.ts',
    'TypeSafeSettings': 'src/types/TypeSafeSettings.ts',
  },
  test: { node: true },
});
