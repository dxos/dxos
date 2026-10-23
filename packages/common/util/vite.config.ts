//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    Position: 'src/Position.ts',
    RealPath: 'src/RealPath.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
