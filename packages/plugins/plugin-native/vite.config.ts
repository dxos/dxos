//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    NativePlugin: 'src/NativePlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
  },
  test: { node: true },
});
