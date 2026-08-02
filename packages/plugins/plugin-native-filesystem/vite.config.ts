//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    NativeFilesystemPlugin: 'src/NativeFilesystemPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    NativeFilesystemCapabilities: 'src/types/NativeFilesystemCapabilities.ts',
    NativeFilesystemEvents: 'src/types/NativeFilesystemEvents.ts',
    NativeFilesystemOperation: 'src/types/NativeFilesystemOperation.ts',
  },
  jsx: 'react',
  test: { node: true },
});
