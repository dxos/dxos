//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    TypeSafePlugin: 'src/TypeSafePlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
  },
  test: { node: true },
});
