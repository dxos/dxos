//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    DeepSeekPlugin: 'src/DeepSeekPlugin.ts',
    plugin: 'src/plugin.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    skills: 'src/skills/index.ts',
  },
  test: { node: true },
});
