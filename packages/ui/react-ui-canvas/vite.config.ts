//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    scene: 'src/scene.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
