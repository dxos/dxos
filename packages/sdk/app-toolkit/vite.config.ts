//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    query: 'src/query.ts',
    ui: 'src/ui/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
