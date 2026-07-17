//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    manager: 'src/manager.tsx',
    preview: 'src/preview.tsx',
    download: 'src/download.ts',
  },
  jsx: 'react',
});
