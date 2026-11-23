//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    api: 'src/api/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    CloudflareOs: 'src/types/CloudflareOs.ts',
    CloudflareOsOperation: 'src/types/CloudflareOsOperation.ts',
    CloudflareOsOperationHandlerSet: 'src/operations/CloudflareOsOperationHandlerSet.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
