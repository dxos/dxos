//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'GoogleOperationHandlerSet': 'src/operations/GoogleOperationHandlerSet.ts',
    'index': 'src/index.ts',
    'GooglePlugin': 'src/GooglePlugin.ts',
    'GoogleOperation': 'src/types/GoogleOperation.ts',
    'apis': 'src/apis/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'services': 'src/services/index.ts',
    'testing': 'src/testing/index.ts',
    'testing/node': 'src/testing/node.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  test: { node: true },
});
