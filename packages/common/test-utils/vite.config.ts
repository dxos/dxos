//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    playwright: 'src/playwright.ts',
    index: 'src/index.ts',
  },
});
