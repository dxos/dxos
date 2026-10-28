//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    LighthousePlugin: 'src/LighthousePlugin.ts',
    plugin: 'src/plugin.tsx',
    client: 'src/client/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    model: 'src/model/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    Finding: 'src/types/Finding.ts',
    LighthouseCapabilities: 'src/types/LighthouseCapabilities.ts',
    LighthouseOperation: 'src/types/LighthouseOperation.ts',
    Research: 'src/types/Research.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
