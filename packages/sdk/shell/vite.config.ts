//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    testing: 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: true, browser: 'chromium', storybook: true },
});
