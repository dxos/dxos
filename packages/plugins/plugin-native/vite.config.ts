//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    NativePlugin: 'src/NativePlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    NativeCapabilities: 'src/types/NativeCapabilities.ts',
    NativeEvents: 'src/types/NativeEvents.ts',
    Settings: 'src/types/Settings.ts',
    Update: 'src/types/Update.ts',
  },
  jsx: 'react',
  test: { node: true },
});
