//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'SandboxPlugin': 'src/SandboxPlugin.ts',
    'skills/index': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'types/index': 'src/types/index.ts',
  },
  test: { node: true },
});
