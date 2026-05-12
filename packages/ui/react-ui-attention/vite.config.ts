//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    testing: 'src/testing/index.ts',
    types: 'src/types/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
