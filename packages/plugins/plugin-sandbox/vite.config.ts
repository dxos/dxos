//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SandboxPlugin: 'src/SandboxPlugin.ts',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    types: 'src/types/index.ts',
  },
  assetsAsFiles: true,
  test: { node: true },
});
