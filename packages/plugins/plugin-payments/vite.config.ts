//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    PaymentsPlugin: 'src/PaymentsPlugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    plugin: 'src/plugin.ts',
    services: 'src/services/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    PaymentsCapabilities: 'src/types/PaymentsCapabilities.ts',
    PaymentsEvents: 'src/types/PaymentsEvents.ts',
    Settings: 'src/types/Settings.ts',
  },
  jsx: 'react',
  test: { node: true },
});
