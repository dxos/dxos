//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    TldrawPlugin: 'src/TldrawPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    Tldraw: 'src/types/Tldraw.ts',
    TldrawCapabilities: 'src/types/TldrawCapabilities.ts',
    TldrawEvents: 'src/types/TldrawEvents.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
