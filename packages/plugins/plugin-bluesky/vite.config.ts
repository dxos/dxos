//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    BlueskyPlugin: 'src/BlueskyPlugin.ts',
    types: 'src/types.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' } },
});
