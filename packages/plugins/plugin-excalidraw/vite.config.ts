//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ExcalidrawPlugin: 'src/ExcalidrawPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
      'Excalidraw': 'src/types/Excalidraw.ts',
    'ExcalidrawCapabilities': 'src/types/ExcalidrawCapabilities.ts',
    'ExcalidrawEvents': 'src/types/ExcalidrawEvents.ts',
    'Settings': 'src/types/Settings.ts',
},
  jsx: 'react',
  test: { node: true, storybook: true },
});
