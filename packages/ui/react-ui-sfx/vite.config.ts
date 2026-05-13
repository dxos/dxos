//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true, storybook: true },
});
