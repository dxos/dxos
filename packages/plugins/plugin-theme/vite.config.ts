//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    ThemePlugin: 'src/ThemePlugin.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    plugin: 'src/plugin.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
