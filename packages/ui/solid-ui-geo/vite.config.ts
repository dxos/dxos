//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    data: 'src/data.ts',
    index: 'src/index.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'solid',
  test: { node: true, storybook: true },
});
