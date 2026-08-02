//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    CrxPlugin: 'src/CrxPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    util: 'src/util/index.ts',
    operations: 'src/operations/index.ts',
    CrxCapabilities: 'src/types/CrxCapabilities.ts',
    CrxEvents: 'src/types/CrxEvents.ts',
    CrxOperation: 'src/types/CrxOperation.ts',
    PageAction: 'src/types/PageAction.ts',
    Settings: 'src/types/Settings.ts',
  },
  jsx: 'react',
  test: { node: true },
});
