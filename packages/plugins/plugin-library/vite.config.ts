//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    LibraryPlugin: 'src/LibraryPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    Book: 'src/types/Book.ts',
    LibraryEvents: 'src/types/LibraryEvents.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
