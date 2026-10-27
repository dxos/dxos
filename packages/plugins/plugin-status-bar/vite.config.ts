//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/StatusBar': 'src/StatusBar.ts',
    'StatusBar': 'src/components/StatusBar/index.ts',
    'index': 'src/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'translations': 'src/translations.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
