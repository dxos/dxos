//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/TypefullyEvents': 'src/TypefullyEvents.ts',
    'index': 'src/index.ts',
    'translations': 'src/translations.ts',
    'services': 'src/services/index.ts',
  },
  test: { node: true },
});
