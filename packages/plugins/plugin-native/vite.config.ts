//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    NativePlugin: 'src/NativePlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    NativeCapabilities: 'src/types/NativeCapabilities.ts',
    NativeEvents: 'src/types/NativeEvents.ts',
    Settings: 'src/types/Settings.ts',
    Update: 'src/types/Update.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
