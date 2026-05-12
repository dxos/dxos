//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    manager: 'src/manager.tsx',
    preview: 'src/preview.tsx',
    index: 'src/index.ts',
  },
  jsx: 'react',
});
