//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ThreadPlugin: 'src/ThreadPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    ThreadCapabilities: 'src/types/ThreadCapabilities.ts',
    ChannelBackend: 'src/types/ChannelBackend.ts',
    ThreadEvents: 'src/types/ThreadEvents.ts',
    ThreadOperation: 'src/types/ThreadOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
