//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    WnfsPlugin: 'src/WnfsPlugin.tsx',
    'WnfsPlugin.node': 'src/WnfsPlugin.node.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    helpers: 'src/helpers/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
