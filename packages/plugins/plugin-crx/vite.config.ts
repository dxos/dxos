//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CrxPlugin: 'src/CrxPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    translations: 'src/translations.ts',
    util: 'src/util/index.ts',
    operations: 'src/operations/index.ts',
    CrxCapabilities: 'src/types/CrxCapabilities.ts',
    CrxEvents: 'src/types/CrxEvents.ts',
    CrxOperation: 'src/types/CrxOperation.ts',
    PageAction: 'src/types/PageAction.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
