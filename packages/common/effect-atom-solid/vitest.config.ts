//
// Copyright 2025 DXOS.org
//

import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

import { TEST_TAGS } from '../../../vitest.base.config';

// TODO(wittjosiah): Get working with vitest.base.config.ts.
export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    name: 'node',
    environment: 'happy-dom',
    tags: TEST_TAGS,
  },
});
