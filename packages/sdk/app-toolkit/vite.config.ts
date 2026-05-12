//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    query: 'src/query.ts',
    ui: 'src/ui/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
