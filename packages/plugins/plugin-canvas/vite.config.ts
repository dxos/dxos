//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Canvas: 'src/types/Canvas.ts',
    CanvasCapabilities: 'src/types/CanvasCapabilities.ts',
    Settings: 'src/types/Settings.ts',
    CanvasPlugin: 'src/CanvasPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
