//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    DevtoolsPlugin: 'src/DevtoolsPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    Devtools: 'src/types/Devtools.ts',
    DevtoolsEvents: 'src/types/DevtoolsEvents.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: { isolate: false } },
});
