//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/DeepSeekEvents': 'src/DeepSeekEvents.ts',
    'index': 'src/index.ts',
    'skills': 'src/skills/index.ts',
  },
  test: { node: true },
});
