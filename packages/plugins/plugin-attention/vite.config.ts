//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing.ts',
    AttentionAction: 'src/types/AttentionAction.ts',
    AttentionCapabilities: 'src/types/AttentionCapabilities.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
