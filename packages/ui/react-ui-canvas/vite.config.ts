//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    '3d': 'src/three/index.ts',
    'io': 'src/three/io/index.ts',
    'motion': 'src/generator/motion.ts',
    'headless': 'src/headless.ts',
    'generator-worker': 'src/generator/worker.ts',
    'testing': 'src/testing/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
