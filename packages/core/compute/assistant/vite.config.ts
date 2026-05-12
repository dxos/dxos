//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    extraction: 'src/extraction/index.ts',
    index: 'src/index.ts',
  },
  test: { node: { environment: 'happy-dom' } },
});
