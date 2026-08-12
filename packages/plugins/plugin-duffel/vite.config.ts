//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    DuffelPlugin: 'src/DuffelPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.tsx',
    services: 'src/services/index.ts',
    translations: 'src/translations.ts',
    DuffelCapabilities: 'src/types/DuffelCapabilities.ts',
    DuffelEvents: 'src/types/DuffelEvents.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
