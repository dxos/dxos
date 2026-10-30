//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'GoogleOperationHandlerSet': 'src/operations/GoogleOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'GoogleOperation': 'src/types/GoogleOperation.ts',
    'apis': 'src/apis/index.ts',
    'operations': 'src/operations/index.ts',
    'services': 'src/services/index.ts',
    'testing': 'src/testing/index.ts',
    'testing/node': 'src/testing/node.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  test: { node: true, workerd: true },
});
