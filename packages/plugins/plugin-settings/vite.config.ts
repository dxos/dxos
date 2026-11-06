//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/SettingsAction': 'src/SettingsAction.ts',
    'index': 'src/index.ts',
    'testing': 'src/testing.ts',
    'translations': 'src/translations.ts',
    'containers': 'src/containers/index.ts',
    'operations': 'src/operations/index.ts',
    'SettingsPath': 'src/types/SettingsPath.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
