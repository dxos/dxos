//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    SettingsPlugin: 'src/SettingsPlugin.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing.ts',
    translations: 'src/translations.ts',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
