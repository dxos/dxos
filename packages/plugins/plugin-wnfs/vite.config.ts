//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    WnfsPlugin: 'src/WnfsPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    helpers: 'src/helpers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    WnfsCapabilities: 'src/types/WnfsCapabilities.ts',
    WnfsEvents: 'src/types/WnfsEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
