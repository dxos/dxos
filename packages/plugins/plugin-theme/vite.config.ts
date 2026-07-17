//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ThemePlugin: 'src/ThemePlugin.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'jsdom' } },
});
