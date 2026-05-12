//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    FeedPlugin: 'src/FeedPlugin.tsx',
    blueprints: 'src/blueprints/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    index: 'src/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
