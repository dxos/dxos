//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/HeyGenEvents': 'src/HeyGenEvents.ts',
    'index': 'src/index.ts',
    'services': 'src/services/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
