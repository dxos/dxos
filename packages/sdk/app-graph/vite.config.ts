//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'scheduler.browser': 'src/scheduler.browser.ts',
    scheduler: 'src/scheduler.ts',
    testing: 'src/testing/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
