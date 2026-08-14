//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    BloggerPlugin: 'src/BloggerPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    Blog: 'src/types/Blog.ts',
    BloggerCapabilities: 'src/types/BloggerCapabilities.ts',
    BloggerEvents: 'src/types/BloggerEvents.ts',
    Publisher: 'src/types/Publisher.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
