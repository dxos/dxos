//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    Jsonb: 'src/Jsonb.ts',
    Position: 'src/Position.ts',
    index: 'src/index.ts',
  },
  test: { node: true },
});
