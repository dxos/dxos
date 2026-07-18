//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'components/IconPicker/icons': 'src/components/IconPicker/icons.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
