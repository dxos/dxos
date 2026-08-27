//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
    'internal': 'src/internal/index.ts',
    // Its own entry rather than part of the main index: nothing that does not use S3 should carry
    // the signer.
    'blob-s3': 'src/blob/s3/index.ts',
  },
  test: { node: true },
});
