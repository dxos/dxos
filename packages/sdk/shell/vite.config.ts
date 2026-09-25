//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    react: 'src/react.ts',
    translations: 'src/translations.ts',
    testing: 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { browser: 'chromium', storybook: true },
});
