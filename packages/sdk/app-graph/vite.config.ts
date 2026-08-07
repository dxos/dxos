//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'scheduler': 'src/scheduler.ts',
    'testing': 'src/testing/index.ts',
    'scheduler.browser': 'src/scheduler.browser.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
