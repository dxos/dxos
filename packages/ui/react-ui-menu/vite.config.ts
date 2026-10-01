//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, browser: 'chromium', storybook: true },
});
