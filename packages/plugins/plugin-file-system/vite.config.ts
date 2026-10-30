//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    containers: 'src/containers/index.ts',
    hooks: 'src/hooks/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    FileSystem: 'src/types/FileSystem.ts',
    FileSystemCapabilities: 'src/types/FileSystemCapabilities.ts',
    FileSystemEvents: 'src/types/FileSystemEvents.ts',
    FileSystemOperation: 'src/types/FileSystemOperation.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
