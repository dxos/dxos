//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    containers: 'src/containers/index.ts',
    services: 'src/services/index.ts',
    translations: 'src/translations.ts',
    PaymentsCapabilities: 'src/types/PaymentsCapabilities.ts',
    PaymentsEvents: 'src/types/PaymentsEvents.ts',
    Settings: 'src/types/Settings.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true },
});
