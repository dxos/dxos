//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'CrmPlugin': 'src/CrmPlugin.ts',
    'skills/index': 'src/skills/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
    'meta': 'src/meta.ts',
    'operations/index': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'sources/index': 'src/sources/index.ts',
    'testing/index': 'src/testing/index.ts',
    'types/index': 'src/types/index.ts',
    'translations': 'src/translations.ts',
    'util': 'src/util/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
